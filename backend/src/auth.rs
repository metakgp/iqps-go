//! Utils for Github OAuth integration and JWT authentication
//!
//! Currently this is only used in the admin dashboard and uses Github OAuth for authentication

use std::collections::BTreeMap;

use color_eyre::eyre::{eyre, Context, ContextCompat};
use http::StatusCode;
use jwt::{Claims, RegisteredClaims, SignWithKey, VerifyWithKey};
use serde::Deserialize;

use crate::env::EnvVars;

#[derive(Clone)]
/// Struct containing the auth information of a user
pub struct Auth {
    pub jwt: String,
    pub username: String,
}

/// Verifies whether a JWT is valid and signed with the secret key
///
/// Returns the username and jwt in a struct
pub async fn verify_token(
    token: &str,
    env_vars: &EnvVars,
) -> Result<Auth, color_eyre::eyre::Error> {
    let jwt_key = env_vars.get_jwt_key()?;
    let claims: Result<Claims, _> = token.verify_with_key(&jwt_key);

    let claims = claims.map_err(|_| eyre!("Claims not found on the JWT."))?;
    let username = claims
        .private
        .get("username")
        .ok_or(eyre!("Username not in the claims."))?;
    let username = username
        .as_str()
        .ok_or(eyre!("Username is not a string."))?;

    Ok(Auth {
        jwt: token.to_owned(),
        username: username.to_owned(),
    })
}

/// Generates a JWT with the username (for claims) and secret key
async fn generate_token(
    username: &str,
    env_vars: &EnvVars,
) -> Result<String, color_eyre::eyre::Error> {
    let jwt_key = env_vars.get_jwt_key()?;

    let expiration = chrono::Utc::now()
        .checked_add_days(chrono::naive::Days::new(7)) // 7 Days expiration
        .context("Error: error setting JWT expiry date")?
        .timestamp()
        .unsigned_abs();

    let mut private_claims = BTreeMap::new();
    private_claims.insert(
        "username".into(),
        serde_json::Value::String(username.into()),
    );

    let claims = Claims {
        registered: RegisteredClaims {
            audience: None,
            issued_at: None,
            issuer: None,
            subject: None,
            not_before: None,
            json_web_token_id: None,
            expiration: Some(expiration),
        },
        private: private_claims,
    };

    Ok(claims.sign_with_key(&jwt_key)?)
}

#[derive(Deserialize)]
struct GithubAccessTokenResponse {
    access_token: String,
}

#[derive(Deserialize)]
struct GithubUserResponse {
    login: String,
}

#[derive(Deserialize)]
struct GithubMembershipResponse {
    state: String,
}

/// Takes a Github OAuth code and creates a JWT authentication token for the user
/// 1. Uses the OAuth code to get an access token.
/// 2. Uses the access token to get the user's username.
/// 3. Uses the username and an admin's access token to verify whether the user is a member of the admins github team, or the admin themselves.
///
/// Returns the JWT if the user is authenticated, `None` otherwise.
pub async fn authenticate_user(
    code: &String,
    env_vars: &EnvVars,
) -> Result<Option<String>, color_eyre::eyre::Error> {
    let client = reqwest::Client::new();

    // Get the access token for authenticating other endpoints
    let response = client
        .get(format!(
            "https://github.com/login/oauth/access_token?client_id={}&client_secret={}&code={}",
            env_vars.gh_client_id, env_vars.gh_client_secret, code
        ))
        .header("Accept", "application/json")
        .send()
        .await
        .context("Error getting access token from Github.")?;

    if response.status() != StatusCode::OK {
        tracing::error!(
            "Github OAuth error getting access token: {}",
            response.text().await?
        );

        return Err(eyre!("Github API response error."));
    }

    let access_token =
        serde_json::from_slice::<GithubAccessTokenResponse>(&response.bytes().await?)
            .context("Error parsing access token response.")?
            .access_token;

    // Get the username of the user who made the request
    let response = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "bruh") // Why is this required :ded:
        .send()
        .await
        .context("Error fetching user's username.")?;

    if response.status() != StatusCode::OK {
        tracing::error!(
            "Github OAuth error getting username: {}",
            response.text().await?
        );

        return Err(eyre!("Github API response error."));
    }

    let username = serde_json::from_slice::<GithubUserResponse>(&response.bytes().await?)
        .context("Error parsing username API response.")?
        .login;

    // Simple user-based authentication
    if username == env_vars.gh_admin_username {
        return Ok(Some(generate_token(&username, env_vars).await?));
    }

    // Check the user's membership in the team
    println!(
        "https://api.github.com/orgs/{}/teams/{}/memberships/{}",
        env_vars.gh_org_name, env_vars.gh_org_team_slug, username
    );

    let response = client
        .get(format!(
            "https://api.github.com/orgs/{}/teams/{}/memberships/{}",
            env_vars.gh_org_name, env_vars.gh_org_team_slug, username
        ))
        .header(
            "Authorization",
            format!("Bearer {}", env_vars.gh_org_admin_token),
        )
        .header("User-Agent", "bruh why is this required")
        .send()
        .await
        .context("Error getting user's team membership")?;

    if response.status() != StatusCode::OK {
        tracing::error!(
            "Github OAuth error getting membership status: {}",
            response.text().await?
        );

        return Err(eyre!("Github API response error."));
    }

    let state = serde_json::from_slice::<GithubMembershipResponse>(&response.bytes().await?)
        .context("Error parsing membership API response.")?
        .state;

    if state != "active" {
        Ok(None)
    } else {
        Ok(Some(generate_token(&username, env_vars).await?))
    }
}
