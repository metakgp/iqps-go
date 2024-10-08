use axum::{http::StatusCode, response::IntoResponse};
use serde::Serialize;

use crate::env::EnvVars;

#[derive(Clone)]
struct RouterState {
    // TODO: Implement db later
    pub db: (),
    pub env_vars: EnvVars,
}

#[derive(serde::Serialize)]
enum Status {
    Success,
    Error,
}

#[derive(serde::Serialize)]
struct BackendResponse<T: serde::Serialize> {
    pub status: Status,
    pub message: String,
    pub data: T,
}

impl<T: serde::Serialize> BackendResponse<T> {
    pub fn ok(message: String, data: T) -> Self {
        Self {
            status: Status::Success,
            message,
            data,
        }
    }

    pub fn error(message: String, data: T) -> Self {
        Self {
            status: Status::Error,
            message,
            data
        }
    }
}

impl<T: Serialize> IntoResponse for BackendResponse<T> {
    fn into_response(self) -> axum::response::Response {
        serde_json::json!(self).to_string().into_response()
    }
}

pub fn get_router(env_vars: EnvVars) -> axum::Router {
    let state = RouterState { db: (), env_vars };

    axum::Router::new()
        .route("/healthcheck", axum::routing::get(handlers::healthcheck))
        .with_state(state)
}

mod handlers {
    use super::BackendResponse;

    pub async fn healthcheck() -> BackendResponse<()> {
        BackendResponse::ok("Hello, World.".into(), ())
    }
}
