use axum::{
    body::Bytes,
    extract::{Json, Multipart},
    http::StatusCode,
};
use color_eyre::eyre::ContextCompat;
use http::HeaderMap;
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

use super::{AppError, BackendResponse, RouterState, Status};

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
            // Commit the transaction
            tx.commit().await?;

            // Get the new db entry
            let new_paper = state.db.get_paper_by_id(id).await?;

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

#[derive(Deserialize)]
pub struct FileDetails {
    course_code: String,
    course_name: String,
    year: i32,
    exam: String,
    semester: String,
    filename: String,
}

/// 10 MiB file size limit
const FILE_SIZE_LIMIT: usize = 10 << 20;
#[derive(Serialize)]
pub struct UploadStatus {
    filename: String,
    status: Status,
    message: String,
}
pub async fn upload(
    State(state): State<RouterState>,
    mut multipart: Multipart,
) -> HandlerReturn<Vec<UploadStatus>> {
    let mut files = Vec::<(HeaderMap, Bytes)>::new();
    let mut file_details: String = "".into();

    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.name().unwrap().to_string();

        if name == "files" {
            files.push((field.headers().clone(), field.bytes().await?));
        } else if name == "file_details" {
            if file_details.is_empty() {
                file_details = field.text().await?;
            } else {
                return Ok(BackendResponse::error(
                    "Error: Multiple `file_details` fields found.".into(),
                    StatusCode::BAD_REQUEST,
                ));
            }
        }
    }

    let files = files;
    let file_details: Vec<FileDetails> = serde_json::from_str(&file_details)?;

    if files.len() > state.env_vars.max_upload_limit {
        return Ok(BackendResponse::error(
            format!(
                "Only upto {} files can be uploaded. Found {}.",
                state.env_vars.max_upload_limit,
                files.len()
            ),
            StatusCode::BAD_REQUEST,
        ));
    }

    if files.len() != file_details.len() {
        return Ok(BackendResponse::error(
            "Error: Number of files and file details array length do not match.".into(),
            StatusCode::BAD_REQUEST,
        ));
    }

    let upload_statuses: Vec<UploadStatus> = files
        .iter()
        .zip(file_details.iter())
        .map(|((file_headers, file_data), details)| {
            let FileDetails {
                course_code,
                course_name,
                year,
                exam,
                semester,
                filename,
            } = details;

            if file_data.len() > FILE_SIZE_LIMIT {
                return UploadStatus {
                    filename: filename.to_owned(),
                    status: Status::Error,
                    message: format!(
                        "File size too big. Only files upto {} MiB are allowed.",
                        FILE_SIZE_LIMIT >> 20
                    ),
                };
            }

            if let Some(content_type) = file_headers.get("content-type") {
                if content_type != "application/pdf" {
                    return UploadStatus {
                        filename: filename.to_owned(),
                        status: Status::Error,
                        message: "Only PDFs are supported.".into(),
                    };
                }
            } else {
                return UploadStatus {
                    filename: filename.to_owned(),
                    status: Status::Error,
                    message: "`content-type` header not found. File type could not be determined."
                        .into(),
                };
            }

            UploadStatus {
                filename: "()".into(),
                status: Status::Error,
                message: "()".into(),
            }
        })
        .collect::<Vec<UploadStatus>>();

    Ok(BackendResponse::ok(
        format!("Successfully processed {} files", upload_statuses.len()),
        upload_statuses,
    ))
}

#[derive(Deserialize)]
pub struct DeleteReq {
    id: i32,
}
pub async fn delete(
    State(state): State<RouterState>,
    Json(body): Json<DeleteReq>,
) -> HandlerReturn<()> {
    let paper_deleted = state.db.soft_delete(body.id).await?;

    if paper_deleted {
        Ok(BackendResponse::ok(
            "Succesfully deleted the paper.".into(),
            (),
        ))
    } else {
        Ok(BackendResponse::error(
            "No paper was changed. Either the paper does not exist, is a library paper (cannot be deleted), or is already deleted.".into(),
            StatusCode::BAD_REQUEST,
        ))
    }
}

pub async fn similar(
    State(state): State<RouterState>,
    Query(body): Query<HashMap<String, String>>,
) -> HandlerReturn<Vec<AdminDashboardQP>> {
    if !body.contains_key("course_code") {
        return Ok(BackendResponse::error(
            "Error: `course_code` is required.".into(),
            StatusCode::BAD_REQUEST,
        ));
    }

    let papers = state
        .db
        .get_similar_papers(
            body.get("course_code")
                .context("Expected course code to be here.")?,
            body.get("year")
                .map(|year| year.parse::<i32>())
                .transpose()?,
            body.get("course_code"),
            body.get("semester"),
            body.get("exam"),
        )
        .await?;

    Ok(BackendResponse::ok(
        format!("Found {} similar papers.", papers.len()),
        papers,
    ))
}
