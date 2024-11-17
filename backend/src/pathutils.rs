//! Utils for parsing paths on the server and to store/retrieve paths from the database
//! A "slug" is the part of the path common to the question paper and is stored in the database. Depending on the requirements, either a URL (eg: static.metakgp.org) or a path (/srv/static) can be prepended to the slug to get the final path to copy/serve/move the question paper to/from.

use std::{
    fs,
    path::{self, Path, PathBuf},
};

use color_eyre::eyre::eyre;
use url::Url;

/// A category of papers, can also be used to represent the directory where these papers are stored
#[allow(unused)]
pub enum PaperCategory {
    /// Unapproved paper
    Unapproved,
    /// Approved paper
    Approved,
    /// Library paper (scraped using the peqp scraper)
    Library,
}

#[derive(Clone, Default)]
/// A set of paths (absolute, relative, or even URLs) for all three categories of papers (directories)
struct PathTriad {
    /// Unapproved paper path
    pub unapproved: PathBuf,
    /// Approved paper path
    pub approved: PathBuf,
    /// Library paper path
    pub library: PathBuf,
}

impl PathTriad {
    /// Gets the path in the triad corresponding to the given paper category.
    pub fn get(&self, category: PaperCategory) -> PathBuf {
        match category {
            PaperCategory::Approved => self.approved.to_owned(),
            PaperCategory::Unapproved => self.unapproved.to_owned(),
            PaperCategory::Library => self.library.to_owned(),
        }
    }
}

#[derive(Clone)]
#[allow(unused)]
/// Struct containing all the paths and URLs required to parse or create any question paper's slug, absolute path, or URL.
pub struct Paths {
    /// URL of the static files server
    static_files_url: Url,
    /// The absolute path to the location from where the static files server serves files
    static_files_path: PathBuf,

    /// The absolute system paths to all three directories on the server
    system_paths: PathTriad,

    /// The slugs to all three directories
    ///
    /// A slug is a relative path independent of the URL or system path. This slug is stored in the database and either the [`crate::pathutils::Paths::static_files_url`] or the [`crate::pathutils::Paths::static_files_path`] is prepended to it to get its URL (to send to the frontend) or the system path (for backend operations)
    path_slugs: PathTriad,
}

impl Default for Paths {
    fn default() -> Self {
        Self {
            static_files_url: Url::parse("https://metakgp.org")
                .expect("This library thinks https://metakgp.org is not a valid URL."),
            static_files_path: PathBuf::default(),
            system_paths: PathTriad::default(),
            path_slugs: PathTriad::default(),
        }
    }
}

#[allow(unused)]
impl Paths {
    /// Creates a new `Paths` struct
    /// # Arguments
    ///
    /// * `static_files_url` - The static files server URL (eg: https://static.metakgp.org)
    /// * `static_file_storage_location` - The path to the location on the server from which the static files are served (eg: /srv/static)
    /// * `uploaded_qps_relative_path` - The path to the uploaded question papers, relative to the static files storage location. (eg: /iqps/uploaded)
    /// * `library_qps_relative_path` - The path to the library question papers, relative to the static files storage location. (eg: /peqp/qp)
    pub fn new(
        static_files_url: &str,
        static_file_storage_location: &Path,
        uploaded_qps_relative_path: &Path,
        library_qps_relative_path: &Path,
    ) -> Result<Self, color_eyre::eyre::Error> {
        // The slugs for each of the uploaded papers directories
        let path_slugs = PathTriad {
            // Use subdirectories `/unapproved` and `/approved` inside the uploaded qps path
            unapproved: uploaded_qps_relative_path.join("unapproved"),
            approved: uploaded_qps_relative_path.join("approved"),
            library: library_qps_relative_path.to_owned(),
        };

        // The absolute system paths for each of the directories
        let system_paths = PathTriad {
            unapproved: path::absolute(static_file_storage_location.join(&path_slugs.unapproved))?,
            approved: path::absolute(static_file_storage_location.join(&path_slugs.approved))?,
            library: path::absolute(static_file_storage_location.join(&path_slugs.library))?,
        };

        // Ensure these system paths exist

        // Throw error for uploaded and library paths
        if !path::absolute(static_file_storage_location.join(uploaded_qps_relative_path))?.exists()
        {
            return Err(eyre!(
                "Path for uploaded papers does not exist: {}",
                system_paths.unapproved.to_string_lossy()
            ));
        }
        if !system_paths.library.exists() {
            return Err(eyre!(
                "Path for library papers does not exist: {}",
                system_paths.library.to_string_lossy()
            ));
        }

        // Create dirs for unapproved and approved
        if !system_paths.unapproved.exists() {
            fs::create_dir(&system_paths.unapproved)?;
        }
        if !system_paths.approved.exists() {
            fs::create_dir(&system_paths.approved)?;
        }

        Ok(Self {
            static_files_url: Url::parse(static_files_url)?,
            static_files_path: path::absolute(static_file_storage_location)?,
            system_paths,
            path_slugs,
        })
    }

    /// Returns the slug for a given filename and paper category (directory)
    pub fn get_slug(&self, filename: &str, category: PaperCategory) -> String {
        self.path_slugs
            .get(category)
            .join(filename)
            .to_string_lossy()
            .to_string()
    }

    /// Returns the absolute system path for the specified directory and filename
    pub fn get_path(&self, filename: &str, dir: PaperCategory) -> PathBuf {
        self.system_paths.get(dir).join(filename)
    }

    /// Returns the absolute system path from a given slug
    pub fn get_path_from_slug(&self, slug: &str) -> PathBuf {
        self.static_files_path.join(slug)
    }

    /// Returns the static server URL for the specified directory and filename
    pub fn get_url(
        &self,
        filename: &str,
        dir: PaperCategory,
    ) -> Result<String, color_eyre::eyre::Error> {
        let slug = self
            .path_slugs
            .get(dir)
            .join(filename)
            .to_string_lossy()
            .into_owned();

        self.get_url_from_slug(&slug)
    }

    /// Returns the static server URL for a given slug
    pub fn get_url_from_slug(&self, slug: &str) -> Result<String, color_eyre::eyre::Error> {
        Ok(self.static_files_url.join(slug)?.as_str().to_string())
    }

    /// Removes any non-alphanumeric character and replaces whitespaces with `-`
    /// Also replaces `/` with `-` and multiple spaces or hyphens will be replaced with a single one
    pub fn sanitize_path(path: &str) -> String {
        path.replace('/', "-") // Replace specific characters with a `-`
            .replace('-', " ") // Convert any series of spaces and hyphens to just spaces
            .split_whitespace() // Split at whitespaces to later replace all whitespaces with `-`
            .map(|part| {
                part.chars()
                    .filter(|&character| character.is_alphanumeric() || character == '-' || character == '_') // Remove any character that is not a `-` or alphanumeric
                    .collect::<String>()
            })
            .collect::<Vec<String>>()
            .join("-") // Join the parts with `-`
    }
}
