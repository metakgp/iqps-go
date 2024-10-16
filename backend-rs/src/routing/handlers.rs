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
    pathutils::PaperCategory,
    qp::{self, AdminDashboardQP},
};

use super::{AppError, BackendResponse, RouterState, Status};

type HandlerReturn<T> = Result<(StatusCode, BackendResponse<T>), AppError>;

/// Healthcheck route. Returns a `Hello World.` message if healthy.
pub async fn healthcheck() -> HandlerReturn<()> {
    Ok(BackendResponse::ok("Hello, World.".into(), ()))
}

/// Fetches all the unapproved papers.
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

/// Searches for question papers given a query and an optional `exam` parameter.
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

/// Takes a Github OAuth code and returns a JWT auth token to log in a user if authorized
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

/// Returns a user's profile (the JWT and username) if authorized and the token is valid. Can be used to check if the user is logged in.
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
    let auth = state.auth.lock().await;

    if let Some(auth) = auth.clone() {
        // Edit the database entry
        let (tx, old_filelink, new_qp) = state
            .db
            .edit_paper(body, &auth.username, &state.env_vars)
            .await?;

        // Copy the actual file
        let old_filepath = state.env_vars.paths.get_path_from_slug(&old_filelink);
        let new_filepath = state.env_vars.paths.get_path_from_slug(&new_qp.filelink);

        if fs::copy(old_filepath, new_filepath).await.is_ok() {
            // Commit the transaction
            tx.commit().await?;

            Ok(BackendResponse::ok(
                "Successfully updated paper details.".into(),
                new_qp.with_url(&state.env_vars)?,
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
    pub course_code: String,
    pub course_name: String,
    pub year: i32,
    pub exam: String,
    pub semester: String,
    pub filename: String,
}

/// 10 MiB file size limit
const FILE_SIZE_LIMIT: usize = 10 << 20;
#[derive(Serialize)]
pub struct UploadStatus {
    filename: String,
    status: Status,
    message: String,
}

/// Uploads question papers to the server
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

    let files_iter = files.iter().zip(file_details.iter());
    let mut upload_statuses = Vec::<UploadStatus>::new();

    for ((file_headers, file_data), details) in files_iter {
        let filename = details.filename.to_owned();

        if file_data.len() > FILE_SIZE_LIMIT {
            upload_statuses.push(UploadStatus {
                filename,
                status: Status::Error,
                message: format!(
                    "File size too big. Only files upto {} MiB are allowed.",
                    FILE_SIZE_LIMIT >> 20
                ),
            });
            continue;
        }

        if let Some(content_type) = file_headers.get("content-type") {
            if content_type != "application/pdf" {
                upload_statuses.push(UploadStatus {
                    filename: filename.to_owned(),
                    status: Status::Error,
                    message: "Only PDFs are supported.".into(),
                });
                continue;
            }
        } else {
            upload_statuses.push(UploadStatus {
                filename,
                status: Status::Error,
                message: "`content-type` header not found. File type could not be determined."
                    .into(),
            });
            continue;
        }

        // Insert the db entry
        let (mut tx, id) = state.db.insert_new_uploaded_qp(details).await?;

        // Create the new filelink (slug)
        let filelink_slug = state
            .env_vars
            .paths
            .get_slug(&format!("{}.pdf", id), PaperCategory::Unapproved);

        // Update the filelink in the db
        if state
            .db
            .update_uploaded_filelink(&mut tx, id, &filelink_slug)
            .await
            .is_ok()
        {
            let filepath = state.env_vars.paths.get_path_from_slug(&filelink_slug);

            // Write the file data
            if fs::write(&filepath, file_data).await.is_ok() {
                if tx.commit().await.is_ok() {
                    upload_statuses.push(UploadStatus {
                        filename,
                        status: Status::Success,
                        message: "Succesfully uploaded file.".into(),
                    });
                    continue;
                } else {
                    // Transaction commit failed, delete the file
                    fs::remove_file(filepath).await?;
                    upload_statuses.push(UploadStatus {
                        filename,
                        status: Status::Success,
                        message: "Succesfully uploaded file.".into(),
                    });
                    continue;
                }
            } else {
                tx.rollback().await?;
            }

            // If the write fails, rollback the transaction, else commit it.
        } else {
            tx.rollback().await?;

            upload_statuses.push(UploadStatus {
                filename,
                status: Status::Error,
                message: "Error updating the filelink".into(),
            });
            continue;
        }

        upload_statuses.push(UploadStatus {
            filename,
            status: Status::Error,
            message: "THIS SHOULD NEVER HAPPEN. REPORT IMMEDIATELY. ALSO THIS WOULDN'T HAPPEN IF RUST HAD STABLE ASYNC CLOSURES.".into(),
        });
    }

    Ok(BackendResponse::ok(
        format!("Successfully processed {} files", upload_statuses.len()),
        upload_statuses,
    ))
}

#[derive(Deserialize)]
pub struct DeleteReq {
    id: i32,
}

/// Deletes a given paper. Library papers cannot be deleted.
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

/// Fetches all question papers that match one or more properties specified. `course_name` is compulsory.
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
