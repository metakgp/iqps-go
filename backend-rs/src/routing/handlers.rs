use axum::{extract::Json, http::StatusCode};
use serde::Serialize;

use std::collections::HashMap;

use axum::extract::{Query, State};
use serde::Deserialize;

use crate::{
    auth,
    qp::{self, AdminDashboardQP},
};

use super::{AppError, BackendResponse, RouterState};

type HandlerReturn<T> = Result<(StatusCode, BackendResponse<T>), AppError>;

/// Healthcheck route. Returns a `Hello World.` message if healthy.
pub async fn healthcheck() -> HandlerReturn<()> {
    Ok(BackendResponse::ok("Hello, World.".into(), ()))
}

pub async fn get_unapproved(
    State(state): State<RouterState>,
) -> HandlerReturn<Vec<AdminDashboardQP>> {
    let papers: Vec<AdminDashboardQP> = state.db.get_unapproved_papers().await?;

    let papers = papers
        .iter()
        .map(|paper| paper.clone().with_url(&state.env_vars))
        .collect::<Result<Vec<qp::AdminDashboardQP>, color_eyre::eyre::Error>>()?;

    Ok(BackendResponse::ok(
        format!("Successfully fetched {} papers.", papers.len()),
        papers,
    ))
}

pub async fn search(
    State(state): State<RouterState>,
    Query(params): Query<HashMap<String, String>>,
) -> HandlerReturn<Vec<qp::SearchQP>> {
    let response = if let Some(query) = params.get("query") {
        let exam: Option<qp::Exam> = if let Some(exam_str) = params.get("exam") {
            Some(qp::Exam::try_from(exam_str).map_err(AppError::from)?)
        } else {
            None
        };

        let papers = state.db.search_papers(query, exam).await?;

        let papers = papers
            .iter()
            .map(|paper| paper.clone().with_url(&state.env_vars))
            .collect::<Result<Vec<qp::SearchQP>, color_eyre::eyre::Error>>()?;

        Ok(BackendResponse::ok(
            format!("Successfully fetched {} papers.", papers.len()),
            papers,
        ))
    } else {
        Ok(BackendResponse::error(
            "`query` URL parameter is required.".into(),
            StatusCode::BAD_REQUEST,
        ))
    };

    response
}

#[derive(Deserialize)]
pub struct OAuthReq {
    code: String,
}
#[derive(Serialize)]
pub struct OAuthRes {
    token: String,
}
pub async fn oauth(
    State(state): State<RouterState>,
    Json(body): Json<OAuthReq>,
) -> HandlerReturn<OAuthRes> {
    if let Some(token) = auth::authenticate_user(&body.code, &state.env_vars).await? {
        Ok(BackendResponse::ok(
            "Successfully authorized the user.".into(),
            OAuthRes { token },
        ))
    } else {
        Ok(BackendResponse::error(
            "Error: User unauthorized.".into(),
            StatusCode::UNAUTHORIZED,
        ))
    }
}

#[derive(Serialize)]
pub struct ProfileRes {
    token: String,
    username: String,
}
pub async fn profile(State(state): State<RouterState>) -> HandlerReturn<ProfileRes> {
    let lock = state.auth.lock().await;

    if let Some(auth) = lock.clone() {
        let username = auth.claims.private.get("username");

        if let Some(username) = username {
            Ok(BackendResponse::ok(
                "Successfully authorized the user.".into(),
                ProfileRes {
                    token: auth.jwt,
                    username: username.to_string(),
                },
            ))
        } else {
            Ok(BackendResponse::error(
                "Username not found in claims.".into(),
                StatusCode::UNAUTHORIZED,
            ))
        }
    } else {
        Ok(BackendResponse::error(
            "Error: User unauthorized.".into(),
            StatusCode::UNAUTHORIZED,
        ))
    }
}
