use std::path::{self, Path, PathBuf};

use url::Url;

/// A category of papers, can also be used to represent the directory where these papers are stored
pub enum PaperCategory {
    Unapproved,
    Approved,
    Library,
}

#[derive(Clone, Default)]
/// A set of paths (absolute, relative, or even URLs) for all three categories of papers (directories)
struct PathTriad {
    pub unapproved: PathBuf,
    pub approved: PathBuf,
    pub library: PathBuf,
}

impl PathTriad {
    pub fn get(&self, category: PaperCategory) -> PathBuf {
        match category {
            PaperCategory::Approved => self.approved.to_owned(),
            PaperCategory::Unapproved => self.unapproved.to_owned(),
            PaperCategory::Library => self.library.to_owned(),
        }
    }
}

#[derive(Clone)]
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

impl Paths {
    pub fn new(
        static_files_url: &str,
        static_file_storage_location: &Path,
        uploaded_qps_relative_path: &Path,
        library_qps_relative_path: &Path,
    ) -> Result<Self, color_eyre::eyre::Error> {
        let path_slugs = PathTriad {
            unapproved: uploaded_qps_relative_path.join("unapproved"),
            approved: uploaded_qps_relative_path.join("approved"),
            library: library_qps_relative_path.to_owned(),
        };

        let system_paths = PathTriad {
            unapproved: path::absolute(static_file_storage_location.join(&path_slugs.unapproved))?,
            approved: path::absolute(static_file_storage_location.join(&path_slugs.approved))?,
            library: path::absolute(static_file_storage_location.join(&path_slugs.library))?,
        };

        Ok(Self {
            static_files_url: Url::parse(static_files_url)?,
            static_files_path: path::absolute(static_file_storage_location)?,
            system_paths,
            path_slugs,
        })
    }

    pub fn get_slug(&self, filename: &str, category: PaperCategory) -> String {
        self.path_slugs
            .get(category)
            .join(filename)
            .to_string_lossy()
            .to_string()
    }

    pub fn get_path(&self, filename: &str, dir: PaperCategory) -> PathBuf {
        self.system_paths.get(dir).join(filename)
    }

    pub fn get_path_from_slug(&self, slug: &str) -> PathBuf {
        self.static_files_path.join(slug)
    }

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

    pub fn get_url_from_slug(&self, slug: &str) -> Result<String, color_eyre::eyre::Error> {
        Ok(self.static_files_url.join(slug)?.as_str().to_string())
    }
}
