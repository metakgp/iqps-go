use clap::Parser;
use tracing_subscriber::prelude::*;

mod db;
mod env;
mod routing;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Read environment variables
    let env_vars = env::EnvVars::parse().process()?;

    // Initialize logger
    let (append_writer, _guard) = tracing_appender::non_blocking(tracing_appender::rolling::never(
        env_vars
            .log_location
            .parent()
            .expect("Where do you want to store that log??"),
        env_vars
            .log_location
            .file_name()
            .expect("Do you want to store the logs in a directory?"),
    ));

    let subscriber = tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(append_writer)
                .with_ansi(false),
        )
        .with(tracing_subscriber::fmt::layer().with_writer(std::io::stdout));

    tracing::subscriber::set_global_default(subscriber)?;

    // Database connection
    let database = db::Database::try_new(&env_vars).await?;

    // Server
    let listener =
        tokio::net::TcpListener::bind(format!("0.0.0.0:{}", env_vars.server_port)).await?;
    tracing::info!("Starting server on port {}", env_vars.server_port);
    axum::serve(listener, routing::get_router(&env_vars, database)).await?;

    Ok(())
}
