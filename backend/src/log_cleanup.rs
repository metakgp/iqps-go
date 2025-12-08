//! Log file cleanup utility
//!
//! This module provides functionality to manually clean up old log files
//! since tracing-appender's max_log_files doesn't always work reliably.

use std::fs;
use std::path::Path;
use std::time::{Duration, SystemTime};

/// Clean up log files older than the specified number of days
pub fn cleanup_old_logs(log_dir: &Path, prefix: &str, keep_days: u64) -> std::io::Result<()> {
    let cutoff_time = SystemTime::now() - Duration::from_secs(keep_days * 24 * 60 * 60);

    for entry in fs::read_dir(log_dir)? {
        let entry = entry?;
        let path = entry.path();

        // Only process files that match our log pattern
        if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
            if filename.starts_with(prefix) && filename.ends_with(".log") {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        if modified < cutoff_time {
                            match fs::remove_file(&path) {
                                Ok(_) => tracing::info!("Deleted old log file: {:?}", path),
                                Err(e) => tracing::warn!("Failed to delete log file {:?}: {}", path, e),
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(())
}
