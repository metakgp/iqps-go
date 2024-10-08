use diesel_async::{AsyncConnection, AsyncPgConnection};

use crate::env::EnvVars;

pub struct Database {
    database_url: String,
    connection: AsyncPgConnection,
}

impl Database {
    pub async fn try_new(env_vars: &EnvVars) -> Result<Self, diesel::ConnectionError> {
        let database_url = format!(
            "postgres://{}:{}@{}:{}/{}",
            env_vars.db_user,
            env_vars.db_password,
            env_vars.db_host,
            env_vars.db_port,
            env_vars.db_name
        );

        Ok(Self {
            connection: AsyncPgConnection::establish(&database_url).await?,
            database_url,
        })
    }
}
