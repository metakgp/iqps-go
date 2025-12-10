//! Script for testing and benchmarking intelligent search.

use clap::Parser;
use flate2::read::GzDecoder;
use iqps_backend::pathutils::PaperCategory;
use iqps_backend::qp::Exam;
use iqps_backend::{db, env, qp, slack};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{self, BufReader, Read, Write};
use std::path::Path;
use tar::Archive;
use tempfile::tempdir;
use tracing::{info, warn};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    if dotenvy::dotenv().is_ok() {
        println!("Loaded an existing .env file.");
    }

    let env_vars = env::EnvVars::parse()?
        .process()
        .expect("Failed to parse environment variables");

    let database = db::Database::new(&env_vars)
        .await
        .expect("Failed to connect to database");

    let search_text = "algo";

    let results = database.search_papers_scores(search_text, vec![]).await?;

    // show results along with the scores
    for result in results {
        println!("{}: {}", result.course_code, result.course_name);
        println!("Year: {}", result.year);
        println!("Semester: {}", String::from(result.semester));
        println!("Exam: {}", String::from(result.exam));
        println!("Note: {}", result.note);

        println!("Scores: {:.2} {:.2} {:.2}", result.fuzzy_score.unwrap_or(0.0), result.fulltext_score.unwrap_or(0.0), result.partial_score.unwrap_or(0.0)); 
    }
    
    


    Ok(())
}


