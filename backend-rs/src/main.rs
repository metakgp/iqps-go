use clap::Parser;
use tracing_subscriber;
use std::fs;

mod env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Read environment variables
    let env_vars = env::EnvVars::parse().process()?;

    // Initialize logger
    let log_file = fs::File::create(env_vars.log_location)?;
    tracing_subscriber::fmt().with_writer(log_file).with_ansi(false).init();

    Ok(())
}
