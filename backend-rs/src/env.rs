use std::path::PathBuf;

use clap::Parser;

#[derive(Parser, Clone)]
pub struct EnvVars {
    // Database
    #[arg(env)]
    /// Database name
    pub db_name: String,
    #[arg(env)]
    /// Database hostname
    pub db_host: String,
    #[arg(env)]
    /// Database port
    pub db_port: String,
    #[arg(env)]
    /// Database username
    pub db_user: String,
    /// Database password
    pub db_password: String,
    #[arg(env)]
    // Auth
    /// OAuth app client id (public token)
    pub gh_client_id: String,
    #[arg(env)]
    /// OAuth app private token
    pub gh_private_id: String,
    #[arg(env)]
    /// JWT encryption secret (make it a long, randomized string)
    pub jwt_secret: String,
    #[arg(env)]
    /// Github organization name
    pub gh_org_name: String,
    #[arg(env)]
    /// Github organization team slug (this team has access to admin dashboard)
    pub gh_org_team_slug: PathBuf,
    #[arg(env)]
    /// An org admin's Github token
    pub gh_org_admin_token: String,

    // Other configs
    #[arg(env, default_value = "10")]
    /// Maximum number of papers that can be uploaded at a time
    pub max_upload_limit: i32,
    #[arg(env, default_value = "./log/application.log")]
    /// Location where logs are stored
    pub log_location: PathBuf,

    // Paths
    #[arg(env, default_value = "https://static.metakgp.org")]
    /// The URL of the static files server (odin's vault)
    pub static_files_url: String,
    #[arg(env, default_value = "/srv/static")]
    /// The path where static files are served from
    pub static_file_storage_location: PathBuf,
    #[arg(env, default_value = "iqps/uploaded")]
    /// The path where uploaded papers are stored temporarily, relative to the `static_file_storage_location`
    pub uploaded_qps_path: PathBuf,

    // Server
    #[arg(env, default_value = "8080")]
    /// The port the server listens on
    pub server_port: i32,
}

impl EnvVars {
    /// Processes the environment variables after reading.
    pub fn process(mut self) -> Result<Self, Box<dyn std::error::Error>> {
        self.static_file_storage_location = std::path::absolute(self.static_file_storage_location)?;
        self.uploaded_qps_path = std::path::absolute(
            self.static_file_storage_location
                .join(self.uploaded_qps_path),
        )?;

        self.log_location = std::path::absolute(self.log_location)?;
        Ok(self)
    }
}
