use std::path::PathBuf;

use clap::Parser;

#[derive(Parser, Clone)]
pub struct EnvVars {
    // Paths
    #[arg(env)]
    pub static_files_url: String,
    #[arg(env, default_value = "/srv/static")]
    pub static_file_storage_location: PathBuf,
    #[arg(env, default_value = "iqps/uploaded")]
    pub uploaded_qps_path: PathBuf,

    // Database
    #[arg(env)]
    pub db_name: String,
    #[arg(env)]
    pub db_host: String,
    #[arg(env)]
    pub db_port: String,
    #[arg(env)]
    pub db_user: String,
    #[arg(env)]

    // Auth
    pub gh_client_id: String,
    #[arg(env)]
    pub gh_private_id: String,
    #[arg(env)]
    pub jwt_secret: String,
    #[arg(env)]
    pub gh_org_name: String,
    #[arg(env)]
    pub gh_org_team_slug: PathBuf,
    #[arg(env)]
    pub gh_org_admin_token: String,

    // Other configs
    #[arg(env, default_value = "10")]
    pub max_upload_limit: i32,
    #[arg(env, default_value = "./log/application.log")]
    pub log_location: PathBuf
}

impl EnvVars {
    /// Processes the environment variables after reading.
    pub fn process(mut self) -> Result<Self, Box<dyn std::error::Error>> {
        self.static_file_storage_location = self.static_file_storage_location.canonicalize()?;
        self.uploaded_qps_path = self.uploaded_qps_path.canonicalize()?;
        self.log_location = self.log_location.canonicalize()?;
        Ok(self)
    }
}