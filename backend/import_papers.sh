#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <file.tar.gz>"
    exit 1
fi

ARCHIVE_PATH="$1"
SERVICE="iqps-backend"
DEST_PATH="/app/qp.tar.gz"

echo "📦 Copying '$ARCHIVE_PATH' to '$SERVICE'..."
docker compose cp "$ARCHIVE_PATH" "$SERVICE":"$DEST_PATH"

echo "⚙️ Running import-papers..."
docker compose exec "$SERVICE" ./import-papers

echo "✅ Done!"
