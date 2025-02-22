//! Script for uploading new library papers to the database.

use clap::Parser;
use flate2::read::GzDecoder;
use iqps_backend::db;
use iqps_backend::env;
use iqps_backend::pathutils::PaperCategory;
use iqps_backend::qp;
use std::fs;
use std::io::BufReader;
use tar::Archive;

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

    let dir = "/tmp/pdfs";
    clean_dir(dir)?;
    extract_tar_gz("qp.tar.gz", dir)?;

    let file = fs::File::open("qp.json").expect("Failed to open JSON file");
    let reader = BufReader::new(file);

    let qps: Vec<qp::LibraryQP> =
        serde_json::from_reader(reader).expect("Failed to parse JSON file");

    for mut qp in qps {
        let similar_papers = database
            .get_similar_papers(
                &qp.course_code,
                Some(qp.year),
                Some(&qp.semester),
                Some(&qp.exam),
            )
            .await?;

        let sem_to_str = |sem: &qp::Semester| -> String { (*sem).into() };
        let exam_to_str = |exam: &qp::Exam| -> String { (*exam).into() };

        if qp.approve_status {
            if let Some(similar) = similar_papers.iter().find(|&p| {
                p.qp.course_code == qp.course_code
                    && p.qp.year == qp.year
                    && sem_to_str(&p.qp.semester) == qp.semester
                    && exam_to_str(&p.qp.exam) == qp.exam
            }) {
                if similar.qp.from_library {
                    // paper already exists in db from library
                    println!("Skipping paper: {}", qp.filename);
                    println!("Reason: Paper already exists in the library.");
                    continue;
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
            let filepath = env_vars.paths.get_path_from_slug(&file_link_slug);

            if let Err(e) = fs::copy(format!("{}/qp/{}", dir, qp.filename), filepath) {
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

    Ok(())
}

fn clean_dir(dir: &str) -> std::io::Result<()> {
    if !std::path::Path::new(dir).exists() {
        std::fs::create_dir_all(dir)?;
    } else {
        let dir = std::fs::read_dir(dir)?;
        for entry in dir {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                std::fs::remove_dir_all(path)?;
            } else {
                std::fs::remove_file(path)?;
            }
        }
    }
    Ok(())
}

fn extract_tar_gz(file_path: &str, output_dir: &str) -> std::io::Result<()> {
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
