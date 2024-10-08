use crate::env::EnvVars;

#[derive(Clone)]
struct RouterState {
    // TODO: Implement db later
    pub db: (),
    pub env_vars: EnvVars,
}

pub fn get_router(env_vars: EnvVars) -> axum::Router {
    let state = RouterState { db: (), env_vars };

    axum::Router::new()
        .route("/healthcheck", axum::routing::get(handlers::healthcheck))
        .with_state(state)
}

mod handlers {
    pub async fn healthcheck() -> String {
        "Hello, World.".into()
    }
}
