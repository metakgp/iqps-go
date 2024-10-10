use axum::{http::StatusCode, response::IntoResponse};
use serde::Serialize;
use tower_http::trace::{self, TraceLayer};

use crate::{
    db::{self, Database},
    env::EnvVars,
};

#[derive(Clone)]
struct RouterState {
    pub db: db::Database,
    pub env_vars: EnvVars,
}

#[derive(serde::Serialize)]
enum Status {
    Success,
    Error,
}

/// Standard backend response format (serialized as JSON)
#[derive(serde::Serialize)]
struct BackendResponse<T: Serialize> {
    pub status: Status,
    pub message: String,
    pub data: Option<T>,
}

impl<T: serde::Serialize> BackendResponse<T> {
    pub fn ok(message: String, data: T) -> (StatusCode, Self) {
        (
            StatusCode::OK,
            Self {
                status: Status::Success,
                message,
                data: Some(data),
            },
        )
    }

    pub fn error(message: String, status_code: StatusCode) -> (StatusCode, Self) {
        (
            status_code,
            Self {
                status: Status::Error,
                message,
                data: None,
            },
        )
    }
}

impl<T: Serialize> IntoResponse for BackendResponse<T> {
    fn into_response(self) -> axum::response::Response {
        serde_json::json!(self).to_string().into_response()
    }
}

pub fn get_router(env_vars: &EnvVars, db: Database) -> axum::Router {
    let state = RouterState {
        db,
        env_vars: env_vars.clone(),
    };

    axum::Router::new()
        .route("/healthcheck", axum::routing::get(handlers::healthcheck))
        .route("/search", axum::routing::get(handlers::search))
        .with_state(state)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(trace::DefaultMakeSpan::new().level(tracing::Level::INFO))
                .on_response(trace::DefaultOnResponse::new().level(tracing::Level::INFO)),
        )
}

pub(super) struct AppError(color_eyre::eyre::Error);
impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        tracing::error!("An error occured: {}", self.0);

        BackendResponse::<()>::error(
            format!("Internal error: {}", self.0),
            StatusCode::INTERNAL_SERVER_ERROR,
        )
        .into_response()
    }
}

impl<E> From<E> for AppError
where
    E: Into<color_eyre::eyre::Error>,
{
    fn from(err: E) -> Self {
        Self(err.into())
    }
}

mod handlers {
    use std::collections::HashMap;

    use axum::{
        extract::{self, State},
        http::StatusCode,
    };
    use color_eyre::eyre::Ok;

    use crate::qp;

    use super::{AppError, BackendResponse, RouterState};

    /// Healthcheck route. Returns a `Hello World.` message if healthy.
    pub async fn healthcheck() -> (StatusCode, BackendResponse<()>) {
        BackendResponse::ok("Hello, World.".into(), ())
    }

    pub async fn search(
        State(state): State<RouterState>,
        extract::Query(params): extract::Query<HashMap<String, String>>,
    ) -> Result<(StatusCode, BackendResponse<Vec<qp::SearchQP>>), AppError> {
        let response = if let Some(query) = params.get("query") {
            let exam: Option<qp::Exam> = if let Some(exam_str) = params.get("exam") {
                Some(qp::Exam::try_from(exam_str.clone()).map_err(AppError::from)?)
            } else {
                None
            };

            let papers = state.db.search_papers(query.clone(), exam).await?;

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

        response.map_err(AppError::from)
    }
}
