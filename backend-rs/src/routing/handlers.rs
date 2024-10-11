use axum::{extract::Json, http::StatusCode};
use serde::Serialize;
use tokio::fs;

use std::collections::HashMap;

use axum::extract::{Query, State};
use serde::Deserialize;

use crate::{
    auth,
    db::EditDetails,
    qp::{self, AdminDashboardQP, Exam, Semester},
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
        Ok(BackendResponse::ok(
            "Successfully authorized the user.".into(),
            ProfileRes {
                token: auth.jwt,
                username: auth.username,
            },
        ))
    } else {
        Ok(BackendResponse::error(
            "Error: User unauthorized.".into(),
            StatusCode::UNAUTHORIZED,
        ))
    }
}

#[derive(Deserialize)]
pub struct EditReq {
    pub id: i32,
    pub course_code: Option<String>,
    pub course_name: Option<String>,
    pub year: Option<i32>,
    pub semester: Option<String>,
    pub exam: Option<String>,
    pub approve_status: Option<bool>,
}
/// Paper edit endpoint (for admin dashboard)
/// Takes a JSON request body. The `id` field is required.
/// Other optional fields can be set to change that particular value in the paper.
pub async fn edit(
    State(state): State<RouterState>,
    Json(body): Json<EditReq>,
) -> HandlerReturn<AdminDashboardQP> {
    let EditReq {
        id,
        course_code,
        course_name,
        year,
        semester,
        exam,
        approve_status,
    } = body;
    let auth = state.auth.lock().await;

    if let Some(auth) = auth.clone() {
        let current_details = state.db.get_paper_by_id(id).await?;
        let semester = if let Some(sem_str) = semester {
            Semester::try_from(&sem_str)?
        } else {
            current_details.semester
        };
        let exam = if let Some(exam_str) = exam {
            Exam::try_from(&exam_str)?
        } else {
            current_details.exam
        };

        let newly_approved = !current_details.approve_status && approve_status.unwrap_or(false);

        // Edit the database entry
        let (tx, filelink) = state
            .db
            .edit_paper(
                id,
                EditDetails {
                    course_code: course_code.unwrap_or(current_details.course_code.clone()),
                    course_name: course_name.unwrap_or(current_details.course_name.clone()),
                    year: year.unwrap_or(current_details.year),
                    semester,
                    exam,
                    approve_status: approve_status.unwrap_or(current_details.approve_status),
                },
                newly_approved,
                &auth.username,
                &state.env_vars,
            )
            .await?;

        // Copy the actual file
        let old_filepath = current_details.get_paper_path(&state.env_vars);
        let new_filepath = state.env_vars.static_file_storage_location.join(filelink);

        if fs::copy(old_filepath, new_filepath).await.is_ok() {
            // Get the new db entry
            let new_paper = state.db.get_paper_by_id(id).await?;

            // Commit the transaction
            tx.commit().await?;

            Ok(BackendResponse::ok(
                "Successfully updated paper details.".into(),
                new_paper.with_url(&state.env_vars)?,
            ))
        } else {
            tx.rollback().await?;
            Ok(BackendResponse::error(
                "Error copying question paper file.".into(),
                StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    } else {
        Ok(BackendResponse::error(
            "Error getting authenticated user's username.".into(),
            StatusCode::UNAUTHORIZED,
        ))
    }
}
