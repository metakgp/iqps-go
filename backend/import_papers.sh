#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <file.tar.gz>"
    exit 1
fi

ARCHIVE_PATH="$1"
SERVICE="iqps-backend"
DEST_PATH="/app/qp.tar.gz"

if [[ ! -f "$ARCHIVE_PATH" ]]; then
    echo "Error: File '$ARCHIVE_PATH' not found."
    exit 1
fi

echo "Copying '$ARCHIVE_PATH' to '$SERVICE'..."
docker compose cp "$ARCHIVE_PATH" "$SERVICE":"$DEST_PATH"

echo "Running import-papers..."
docker compose exec "$SERVICE" ./import-papers

echo "Deleting copied file from container..."
docker compose exec "$SERVICE" rm -f "$DEST_PATH"

echo "Done!"
