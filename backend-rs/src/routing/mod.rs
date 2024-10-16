use std::sync::Arc;

use axum::{
    extract::{DefaultBodyLimit, Json},
    http::StatusCode,
    response::IntoResponse,
};
use http::{HeaderValue, Method};
use serde::Serialize;
use tokio::sync::Mutex;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::{self, TraceLayer},
};

use crate::{
    db::{self, Database},
    env::EnvVars,
};

mod handlers;
mod middleware;

pub use handlers::FileDetails;

pub fn get_router(env_vars: &EnvVars, db: Database) -> axum::Router {
    let state = RouterState {
        db,
        env_vars: env_vars.clone(),
        auth: Arc::new(Mutex::new(None)),
    };

    axum::Router::new()
        .route("/unapproved", axum::routing::get(handlers::get_unapproved))
        .route("/profile", axum::routing::get(handlers::profile))
        .route("/edit", axum::routing::post(handlers::edit))
        .route("/delete", axum::routing::post(handlers::delete))
        .route("/similar", axum::routing::get(handlers::similar))
        .route_layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::verify_jwt_middleware,
        ))
        .route("/oauth", axum::routing::post(handlers::oauth))
        .route("/healthcheck", axum::routing::get(handlers::healthcheck))
        .route("/search", axum::routing::get(handlers::search))
        .layer(DefaultBodyLimit::max(2 << 20)) // Default limit of 2 MiB
        .route("/upload", axum::routing::post(handlers::upload))
        .layer(DefaultBodyLimit::max(50 << 20)) // 50 MiB limit for upload endpoint
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

#[derive(Clone)]
struct Auth {
    jwt: String,
    username: String,
}
#[derive(Clone)]
struct RouterState {
    pub db: db::Database,
    pub env_vars: EnvVars,
    pub auth: Arc<Mutex<Option<Auth>>>,
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
