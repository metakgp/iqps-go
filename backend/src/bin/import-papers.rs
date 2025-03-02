//! Script for uploading new library papers to the database.

use clap::Parser;
use flate2::read::GzDecoder;
use iqps_backend::pathutils::PaperCategory;
use iqps_backend::{db, env, qp};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{self, BufReader, Read, Write};
use std::path::Path;
use tar::Archive;
use tempfile::tempdir;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    if dotenvy::dotenv().is_ok() {
        println!("Loaded an existing .env file.");
    }
    let env_vars = env::EnvVars::parse()
        .process()
        .expect("Failed to parse environment variables");

    let database = db::Database::new(&env_vars)
        .await
        .expect("Failed to connect to database");

    let dir = tempdir()?;
    let dir_path = dir.path();
    extract_tar_gz("qp.tar.gz", dir_path)?;

    let file = fs::File::open(dir_path.join("qp.json")).expect("Failed to open JSON file");
    let reader = BufReader::new(file);

    let qps: Vec<qp::LibraryQP> =
        serde_json::from_reader(reader).expect("Failed to parse JSON file");

    print!("This will add {} new papers. Continue? [Y/n] ", qps.len());
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

    for mut qp in qps {
        let file_path = dir_path.join(format!("qp/{}", qp.filename));
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
            if let Some(similar) = similar_papers.iter().next() {
                // todo: what if there are multiple similar papers?
                if similar.qp.from_library {
                    // check pdf hash
                    let other_path = env_vars.paths.get_path_from_slug(&similar.qp.filelink);
                    let other_hash = hash_file(&other_path).expect("Failed to hash file");
                    if hash == other_hash {
                        // paper already exists in db
                        println!("Skipping paper (already exists): {}", qp.filename);
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
                eprintln!("Failed to copy file: {}", e);
                tx.rollback().await?;

                break;
            } else {
                tx.commit().await?;
                println!("Successfully uploaded paper: {}", qp.filename);
            }
        } else {
            eprintln!("Failed to update filelink");
            tx.rollback().await?;
            break;
        }
    }

    println!("Finished uploading papers to database.");
    dir.close()?;

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
    let file =
        fs::File::open(file_path).expect(format!("Failed to open file: {}", file_path).as_str());
    let buf_reader = BufReader::new(file);
    let decoder = GzDecoder::new(buf_reader);
    let mut archive = Archive::new(decoder);
    archive
        .unpack(output_dir)
        .expect("Failed to unpack tar.gz file");
    Ok(())
}
