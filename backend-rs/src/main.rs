use clap::Parser;
use std::fs;
use tracing;
use tracing_subscriber::prelude::*;

mod env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Read environment variables
    let env_vars = env::EnvVars::parse().process()?;

    // Initialize logger
    let log_file = fs::File::open(env_vars.log_location)?;

    let subscriber = tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(log_file)
                .with_ansi(false),
        )
        .with(tracing_subscriber::fmt::layer().with_writer(std::io::stdout));

    tracing::subscriber::set_global_default(subscriber)?;

    Ok(())
}
