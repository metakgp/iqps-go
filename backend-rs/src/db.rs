use diesel::Connection;

use crate::env::EnvVars;

struct Database {
    database_url: String,
    connection: diesel::PgConnection,
}

impl Database {
    fn try_new(env_vars: &EnvVars) -> Result<Self, diesel::ConnectionError> {
        let database_url = format!(
            "postgres://{}:{}@{}:{}/{}",
            env_vars.db_user,
            env_vars.db_password,
            env_vars.db_host,
            env_vars.db_port,
            env_vars.db_name
        );

        Ok(Self {
            connection: diesel::PgConnection::establish(&database_url)?,
            database_url,
        })
    }
}
