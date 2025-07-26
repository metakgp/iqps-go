//! Utils for Slack App integration.

use color_eyre::eyre;
use http::StatusCode;

/// Sends a notification to the Slack channel whenever a new paper is uploaded.
pub async fn send_slack_message(
    webhook_url: &str,
    count: usize,
    unapproved: i64,
) -> Result<(), color_eyre::eyre::Error> {
    if webhook_url.is_empty() {
        return Ok(());
    }

    let message = format!(
        "🔔 {} uploaded to IQPS!\n\n<https://qp.metakgp.org/admin|Review> | Total Unapproved papers: *{}*",
        if count == 1 {
            "A new paper was".into()
        } else {
            format!("{} new papers were", count)
        },
        unapproved
    );

    let client = reqwest::Client::new();
    let response = client
        .post(webhook_url)
        .json(&serde_json::json!({ "text": message }))
        .send()
        .await?;

    if response.status() != StatusCode::OK {
        return Err(eyre::eyre!(
            "Failed to send message to Slack: {}",
            response.status()
        ));
    }

    Ok(())
}
