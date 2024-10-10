use std::time::Duration;

use sqlx::{postgres::PgPoolOptions, PgPool};

use crate::env::EnvVars;

#[derive(Clone)]
pub struct Database {
    connection: PgPool,
}

impl Database {
    pub async fn try_new(env_vars: &EnvVars) -> Result<Self, Box<dyn std::error::Error>> {
        let database_url = format!(
            "postgres://{}:{}@{}:{}/{}",
            env_vars.db_user,
            env_vars.db_password,
            env_vars.db_host,
            env_vars.db_port,
            env_vars.db_name
        );

        let conn_pool = PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(Duration::from_secs(3))
            .connect(&database_url)
            .await?;

        Ok(Self {
            connection: conn_pool,
        })
    }
}
