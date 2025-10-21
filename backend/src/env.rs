//! ### Environment Variables
//!
//!  Each field in the struct `EnvVars` corresponds to an environment variable. The environment variable name will be in all capitals. The default values are set using the `arg()` macro of the `clap` crate. Check the source code for the defaults.

use std::path::PathBuf;

use hmac::{digest::InvalidLength, Hmac, Mac};
use sha2::Sha256;

use crate::pathutils::Paths;

#[derive(Clone)]
pub struct EnvVars {
    // Database
    /// Database name
    pub db_name: String,
    /// Database hostname
    pub db_host: String,
    /// Database port
    pub db_port: String,
    /// Database username
    pub db_user: String,
    /// Database password
    pub db_password: String,

    // Auth
    /// OAuth app client id (public token)
    pub gh_client_id: String,
    /// An org admin's Github token (with the `read:org` permission)
    pub gh_org_admin_token: String,
    /// JWT encryption secret (make it a long, randomized string)
    jwt_secret: String,
    /// OAuth app client secret
    pub gh_client_secret: String,
    /// Github organization name
    pub gh_org_name: String,
    /// Github organization team slug (this team has access to admin dashboard)
    pub gh_org_team_slug: String,
    /// The usernames of the admins (additional to org team members, comma separated)
    pub gh_admin_usernames: String,
    /// URL of Slack webhook for sending notifications
    pub slack_webhook_url: String, 

    // Other configs
    /// Maximum number of papers that can be uploaded at a time
    pub max_upload_limit: usize,
    /// Location where logs are stored
    pub log_location: PathBuf,

    // Paths
    /// The URL of the static files server (odin's vault)
    static_files_url: String,
    /// The path where static files are served from
    static_file_storage_location: PathBuf,
    /// The path where uploaded papers are stored temporarily, relative to the `static_file_storage_location`
    uploaded_qps_path: PathBuf,
    /// The path where library papers (scrapped) are stored, relative to the `static_file_storage_location`
    library_qps_path: PathBuf,

    // Server
    /// The port the server listens on
    pub server_port: i32,

    // CORS
    /// List of origins allowed (as a list of values separated by commas `origin1, origin2`)
    pub cors_allowed_origins: String,

    /// All paths must be handled using this
    pub paths: Paths,
}

impl EnvVars {    
    /// Parses the environment variables into the struct
    pub fn parse() -> Result<Self, Box<dyn std::error::Error>> {
        let db_name = std::env::var("DB_NAME")?;
        let db_host = std::env::var("DB_HOST")?;
        let db_port = std::env::var("DB_PORT")?;
        let db_user = std::env::var("DB_USER")?;
        let db_password = std::env::var("DB_PASSWORD")?;
        let gh_client_id = std::env::var("GH_CLIENT_ID")?;
        let gh_org_admin_token = std::env::var("GH_ORG_ADMIN_TOKEN")?;
        let jwt_secret = std::env::var("JWT_SECRET")?;
        let gh_client_secret = std::env::var("GH_CLIENT_SECRET")?;
        let gh_org_name = std::env::var("GH_ORG_NAME").unwrap_or_default();
        let gh_org_team_slug = std::env::var("GH_ORG_TEAM_SLUG").unwrap_or_default();
        let gh_admin_usernames = std::env::var("GH_ADMIN_USERNAMES").unwrap_or_default();
        let slack_webhook_url = std::env::var("SLACK_WEBHOOK_URL").unwrap_or_default();
        let max_upload_limit = std::env::var("MAX_UPLOAD_LIMIT")
            .unwrap_or_else(|_| "10".to_string())
            .parse::<usize>()?;
        let log_location = std::env::var("LOG_LOCATION")
            .unwrap_or_else(|_| "./log/application.log".to_string())
            .into();
        let static_files_url = std::env::var("STATIC_FILES_URL")
            .unwrap_or_else(|_| "https://static.metakgp.org".to_string());
        let static_file_storage_location = std::env::var("STATIC_FILE_STORAGE_LOCATION")
            .unwrap_or_else(|_| "/srv/static".to_string())
            .into();
        let uploaded_qps_path = std::env::var("UPLOADED_QPS_PATH")
            .unwrap_or_else(|_| "/iqps/uploaded".to_string())
            .into();
        let library_qps_path = std::env::var("LIBRARY_QPS_PATH")
            .unwrap_or_else(|_| "/peqp/qp".to_string())
            .into();
        let server_port = std::env::var("SERVER_PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<i32>()?;
        let cors_allowed_origins = std::env::var("CORS_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "https://qp.metakgp.org,http://localhost:5173".to_string());
        Ok(Self {
            db_name,
            db_host,
            db_port,
            db_user,
            db_password,
            gh_client_id,
            gh_org_admin_token,
            jwt_secret,
            gh_client_secret,
            gh_org_name,
            gh_org_team_slug,
            gh_admin_usernames,
            slack_webhook_url,
            max_upload_limit,
            log_location,
            static_files_url,
            static_file_storage_location,
            uploaded_qps_path,
            library_qps_path,
            server_port,
            cors_allowed_origins,
            paths: Paths::default(),
        })
    }
    
    /// Processes the environment variables after reading.
    pub fn process(mut self) -> Result<Self, Box<dyn std::error::Error>> {
        self.paths = Paths::new(
            &self.static_files_url,
            &self.static_file_storage_location,
            &self.uploaded_qps_path,
            &self.library_qps_path,
        )?;
        self.log_location = std::path::absolute(self.log_location)?;

        Ok(self)
    }

    /// Returns the JWT signing key
    pub fn get_jwt_key(&self) -> Result<Hmac<Sha256>, InvalidLength> {
        Hmac::new_from_slice(self.jwt_secret.as_bytes())
    }
}
