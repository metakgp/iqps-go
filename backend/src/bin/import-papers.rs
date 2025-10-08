//! Script for uploading new library papers to the database.

use clap::Parser;
use flate2::read::GzDecoder;
use iqps_backend::pathutils::PaperCategory;
use iqps_backend::{db, env, qp, slack};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{self, BufReader, Read, Write};
use std::path::Path;
use tar::Archive;
use tempfile::tempdir;
use tracing::{info, warn};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Parser, Debug)]
#[command(
    name = "import-papers",
    about = "Imports papers into the database from an archive.",
    version,
    author
)]
struct Args {
    /// Path to the .tar.gz file containing papers (e.g., qp.tar.gz)
    file: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    if dotenvy::dotenv().is_ok() {
        println!("Loaded an existing .env file.");
    }

    let env_vars = env::EnvVars::parse()?
        .process()
        .expect("Failed to parse environment variables");

	let args = Args::parse();
	if !Path::new(&args.file).exists() {
		eprintln!("Error: file '{}' not found.", args.file);
		std::process::exit(1);
	}
	
    let database = db::Database::new(&env_vars)
        .await
        .expect("Failed to connect to database");

    let dir = tempdir()?;
    let dir_path = dir.path();
    extract_tar_gz(&args.file, dir_path)?;

    let file = fs::File::open(dir_path.join("qp.json")).expect("Failed to open JSON file");
    let reader = BufReader::new(file);

    let qps: Vec<qp::LibraryQP> =
        serde_json::from_reader(reader).expect("Failed to parse JSON file");
    let count = qps.len();

    print!("This will add {} new papers. Continue? [Y/n] ", count);
    io::stdout().flush().unwrap();
    let mut input = String::new();
    io::stdin()
        .read_line(&mut input)
        .expect("Failed to read input");
    match input.trim().to_lowercase().as_str() {
        "y" | "" => {}
        "n" => {
            return Ok(());
        }
        _ => {
            eprintln!("Invalid input");
            return Ok(());
        }
    }

    println!("Uploading papers to database...");

    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let log_filename = format!("peqp_import_{}.log", timestamp);

    let log_path = env_vars
        .log_location
        .parent()
        .expect("Where do you want to store that log??")
        .join(&log_filename);

    let log_file = File::create(&log_path).expect("Failed to create log file");

    tracing_subscriber::registry()
        .with(
            fmt::layer()
                .with_writer(log_file)
                .with_ansi(false)
                .with_level(true),
        )
        .init();

    for mut qp in qps {
        let file_path = dir_path.join(format!("qp/{}", qp.filename)); // TODO use consistent format
        let hash = hash_file(&file_path).expect("Failed to hash file");

        let similar_papers = database
            .get_similar_papers(
                &qp.course_code,
                Some(qp.year),
                Some(&qp.semester),
                Some(&qp.exam),
            )
            .await?;

        if qp.approve_status {
            if let Some(similar) = similar_papers.first() {
                // todo: what if there are multiple similar papers?
                if similar.qp.from_library {
                    // check pdf hash
                    let other_path = env_vars.paths.get_path_from_slug(&similar.qp.filelink);
                    let other_hash = hash_file(&other_path).expect("Failed to hash file");
                    if hash == other_hash {
                        // paper already exists in db
                        info!("Skipping paper (already exists): {}", qp.filename);
                        continue;
                    } else {
                        // wrong metadata, or different pdf of same paper
                        qp.approve_status = false;
                    }
                } else {
                    // paper exists in db from user uploads
                    qp.approve_status = false;
                }
            }
        }

        let (mut tx, id) = database.insert_new_library_qp(&qp).await?;
        let file_name = format!("{}_{}", id, qp.filename);

        let file_link_slug = env_vars.paths.get_slug(&file_name, PaperCategory::Library);

        if database
            .update_filelink(&mut tx, id, &file_link_slug)
            .await
            .is_ok()
        {
            let new_path = env_vars.paths.get_path_from_slug(&file_link_slug);

            if let Err(e) = fs::copy(file_path, new_path) {
                warn!("Failed to copy file: {}", e);
                tx.rollback().await?;

                break;
            } else {
                tx.commit().await?;
                info!("Successfully uploaded paper: {}", qp.filename);
            }
        } else {
            warn!("Failed to update filelink");
            tx.rollback().await?;
            break;
        }
    }
    
    println!("Finished uploading papers to database.");
    dir.close()?;

    let message = format!(
      "{} papers have been imported into IQPS!",
      count,
    );

    let _ = slack::send_slack_message(
      &env_vars.slack_webhook_url,
      &message,
    ).await;

    Ok(())
}

fn hash_file(path: &Path) -> std::io::Result<Vec<u8>> {
    let mut file = BufReader::new(File::open(path)?);
    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192];

    loop {
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    Ok(hasher.finalize().to_vec())
}

fn extract_tar_gz(file_path: &str, output_dir: &Path) -> std::io::Result<()> {
    let file = fs::File::open(file_path)?;
    let buf_reader = BufReader::new(file);
    let decoder = GzDecoder::new(buf_reader);
    let mut archive = Archive::new(decoder);
    archive.unpack(output_dir)?;
    Ok(())
}
