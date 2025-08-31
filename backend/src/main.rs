//! ### IQPS Backend
//!
//! The backend is divided into multiple modules. The [`routing`] module contains all the route handlers and the [`db`] module contains all database queries and models. Other modules are utilities used throughout the backend.

use clap::Parser;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::prelude::*;

mod auth;
mod db;
mod env;
mod pathutils;
mod qp;
mod routing;
mod slack;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Read dotenv if it exists
    if dotenvy::dotenv().is_ok() {
        println!("Loaded an existing .env file.");
    }

    // Read environment variables
    let env_vars = env::EnvVars::parse().process()?;

    // Initialize logger
    let (append_writer, _guard) = tracing_appender::non_blocking(
        RollingFileAppender::builder()
            .rotation(Rotation::DAILY)
            .max_log_files(2) // Keep the last 2 days of logs
            .filename_prefix(
                env_vars
                    .log_location
                    .file_name()
                    .expect("Do you want to store the logs in a directory?")
                    .to_str()
                    .expect("Error converting log filename to string"),
            )
            .build(
                env_vars
                    .log_location
                    .parent()
                    .expect("Where do you want to store that log??"),
            )?,
    );

    let subscriber = tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(append_writer)
                .with_ansi(false),
        )
        .with(tracing_subscriber::fmt::layer().with_writer(std::io::stdout));

    tracing::subscriber::set_global_default(subscriber)?;

    // Database connection
    let database = db::Database::new(&env_vars).await?;

    // Server
    let listener =
        tokio::net::TcpListener::bind(format!("0.0.0.0:{}", env_vars.server_port)).await?;
    tracing::info!("Starting server on port {}", env_vars.server_port);
    axum::serve(listener, routing::get_router(&env_vars, database)).await?;

    Ok(())
}
