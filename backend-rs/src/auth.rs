use std::collections::BTreeMap;

use color_eyre::eyre::{eyre, Context, ContextCompat};
use http::StatusCode;
use jwt::{Claims, RegisteredClaims, SignWithKey, VerifyWithKey};
use serde::Deserialize;

use crate::{
    env::EnvVars,
    routing::{self, AppError},
};

pub async fn verify_token(token: &String, env_vars: &EnvVars) -> Result<bool, routing::AppError> {
    let jwt_key = env_vars.get_jwt_key()?;
    let claims: Result<Claims, _> = token.verify_with_key(&jwt_key);

    Ok(claims.is_ok())
}

async fn generate_token(username: String, env_vars: &EnvVars) -> Result<String, routing::AppError> {
    let jwt_key = env_vars.get_jwt_key()?;

    let expiration = chrono::Utc::now()
        .checked_add_days(chrono::naive::Days::new(7)) // 7 Days expiration
        .context("Error: error setting JWT expiry date")?
        .timestamp()
        .unsigned_abs();

    let mut private_claims = BTreeMap::new();
    private_claims.insert("username".into(), serde_json::Value::String(username));

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
/// 3. Uses the username and and a admin's access token to verify whether the user is a member of the admins github team.
///
/// Returns the JWT if the user is authenticated, `None` otherwise.
pub async fn authenticate_user(
    code: &String,
    env_vars: &EnvVars,
) -> Result<Option<String>, routing::AppError> {
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

        return Err(eyre!("Github API response error.")).map_err(AppError::from);
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

        return Err(eyre!("Github API response error.")).map_err(AppError::from);
    }

    let username = serde_json::from_slice::<GithubUserResponse>(&response.bytes().await?)
        .context("Error parsing username API response.")?
        .login;

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

        return Err(eyre!("Github API response error.")).map_err(AppError::from);
    }

    let state = serde_json::from_slice::<GithubMembershipResponse>(&response.bytes().await?)
        .context("Error parsing membership API response.")?
        .state;

    if state != "active" {
        Ok(None)
    } else {
        Ok(Some(generate_token(username, env_vars).await?))
    }
}
