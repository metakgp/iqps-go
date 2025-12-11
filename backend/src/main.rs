//! ### IQPS Backend
//!
//! The backend is divided into multiple modules. The [`routing`] module contains all the route handlers and the [`db`] module contains all database queries and models. Other modules are utilities used throughout the backend.

use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::prelude::*;

// Manual log cleanup function to ensure old logs are deleted
fn prune_old_logs(dir: &std::path::Path, prefix: &str, keep: usize) {
    let mut files: Vec<_> = std::fs::read_dir(dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.file_name()
                .unwrap()
                .to_str()
                .unwrap()
                .starts_with(prefix)
        })
        .collect();

    files.sort(); // oldest first

    while files.len() > keep {
        let old = files.remove(0);
        let _ = std::fs::remove_file(&old);
    }
}

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
    let env_vars = env::EnvVars::parse()?.process()?;

    // Initialize logger
    let log_dir = env_vars
        .log_location
        .parent()
        .expect("Where do you want to store that log??");
    let log_filename = env_vars
        .log_location
        .file_stem()
        .expect("Do you want to store the logs in a directory?")
        .to_str()
        .expect("Error converting log filename to string");

    let (append_writer, _guard) = tracing_appender::non_blocking(
        RollingFileAppender::builder()
            .rotation(Rotation::DAILY)
            .max_log_files(2) // Keep the last 2 days of logs
            .filename_prefix(log_filename)
            .build(log_dir)?,
    );

    // Run manual cleanup to enforce max 2 log files
    prune_old_logs(
        env_vars
            .log_location
            .parent()
            .expect("Log directory missing"),
        env_vars
            .log_location
            .file_stem()
            .unwrap()
            .to_str()
            .unwrap(),
        2, // keep last 2 files
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
