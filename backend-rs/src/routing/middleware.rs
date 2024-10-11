use axum::{
    extract::{Request, State},
    middleware::Next,
    response::{IntoResponse, Response},
};
use http::{HeaderMap, StatusCode};

use crate::auth;

use super::{AppError, Auth, BackendResponse, RouterState};

pub async fn verify_jwt_middleware(
    State(state): State<RouterState>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    if let Some(auth_header) = headers.get("Authorization") {
        if let Some(jwt) = auth_header.to_str()?.strip_prefix("Bearer ") {
            let claims = auth::verify_token(jwt, &state.env_vars).await?;

            if let Some(claims) = claims {
                let mut state_jwt = state.auth.lock().await;
                *state_jwt = Auth {
                    jwt: jwt.to_string(),
                    claims,
                }
                .into();
            } else {
                return Ok(BackendResponse::<()>::error(
                    "Authorization token invalid.".into(),
                    StatusCode::UNAUTHORIZED,
                )
                .into_response());
            }
        } else {
            return Ok(BackendResponse::<()>::error(
                "Authorization header format invalid.".into(),
                StatusCode::UNAUTHORIZED,
            )
            .into_response());
        }
    } else {
        return Ok(BackendResponse::<()>::error(
            "Authorization header missing.".into(),
            StatusCode::UNAUTHORIZED,
        )
        .into_response());
    }

    Ok(next.run(request).await)
}
