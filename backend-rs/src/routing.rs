use axum::{extract::Json, http::StatusCode, response::IntoResponse};
use http::{HeaderValue, Method};
use serde::Serialize;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::{self, TraceLayer},
};

use crate::{
    db::{self, Database},
    env::EnvVars,
};

pub fn get_router(env_vars: &EnvVars, db: Database) -> axum::Router {
    let state = RouterState {
        db,
        env_vars: env_vars.clone(),
    };

    axum::Router::new()
        .route("/oauth", axum::routing::post(handlers::oauth))
        .route("/healthcheck", axum::routing::get(handlers::healthcheck))
        .route("/search", axum::routing::get(handlers::search))
        .with_state(state)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(trace::DefaultMakeSpan::new().level(tracing::Level::INFO))
                .on_response(trace::DefaultOnResponse::new().level(tracing::Level::INFO)),
        )
        .layer(
            CorsLayer::new()
                .allow_headers(Any)
                .allow_methods(vec![Method::GET, Method::POST, Method::OPTIONS])
                .allow_origin(
                    env_vars
                        .cors_allowed_origins
                        .split(',')
                        .map(|origin| {
                            origin
                                .trim()
                                .parse::<HeaderValue>()
                                .expect("CORS Allowed Origins Invalid")
                        })
                        .collect::<Vec<HeaderValue>>(),
                ),
        )
}

mod handlers {
    use std::collections::HashMap;

    use axum::{
        extract::{Json, Query, State},
        http::StatusCode,
    };
    use color_eyre::eyre::Ok;
    use serde::{Deserialize, Serialize};

    use crate::{auth, qp};

    use super::{AppError, BackendResponse, RouterState};

    type HandlerReturn<T> = Result<(StatusCode, BackendResponse<T>), AppError>;

    /// Healthcheck route. Returns a `Hello World.` message if healthy.
    pub async fn healthcheck() -> HandlerReturn<()> {
        Ok(BackendResponse::ok("Hello, World.".into(), ())).map_err(AppError::from)
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
        .map_err(AppError::from)
    }
}

#[derive(Clone)]
struct RouterState {
    pub db: db::Database,
    pub env_vars: EnvVars,
}

#[derive(Clone, Copy)]
enum Status {
    Success,
    Error,
}

impl From<Status> for String {
    fn from(value: Status) -> Self {
        match value {
            Status::Success => "success".into(),
            Status::Error => "error".into(),
        }
    }
}

impl Serialize for Status {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&String::from(*self))
    }
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
        Json(self).into_response()
    }
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
