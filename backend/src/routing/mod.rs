//! Router, [`handlers`], [`middleware`], state, and response utils.

use axum::{
    extract::{DefaultBodyLimit, Json},
    http::StatusCode,
    response::IntoResponse,
};
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

mod handlers;
mod middleware;

pub use handlers::{EditReq, FileDetails};

/// Returns the Axum router for IQPS
pub fn get_router(env_vars: &EnvVars, db: Database) -> axum::Router {
    let state = RouterState {
        db,
        env_vars: env_vars.clone(),
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
/// The state of the axum router, containing the environment variables and the database connection.
struct RouterState {
    pub db: db::Database,
    pub env_vars: EnvVars,
}

#[derive(Clone, Copy)]
/// The status of a server response
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
    /// Whether the operation succeeded or failed
    pub status: Status,
    /// A message describing the state of the operation (success/failure message)
    pub message: String,
    /// Any optional data sent (only sent if the operation was a success)
    pub data: Option<T>,
}

impl<T: serde::Serialize> BackendResponse<T> {
    /// Creates a new success backend response with the given message and data
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

    /// Creates a new error backend response with the given message, data, and an HTTP status code
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

/// A struct representing the error returned by a handler. This is automatically serialized into JSON and sent as an internal server error (500) backend response. The `?` operator can be used anywhere inside a handler to do so.
pub(super) struct AppError(color_eyre::eyre::Error);
impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        tracing::error!("An error occured: {}", self.0);

        BackendResponse::<()>::error(
            "An internal server error occured. Please try again later.".into(),
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
