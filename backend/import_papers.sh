#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <file.tar.gz>"
    exit 1
fi

ARCHIVE_PATH="$1"
BASENAME="$(basename "$ARCHIVE_PATH")"
DEST_PATH="/tmp/$BASENAME"
SERVICE="iqps-backend"

echo "Copying '$ARCHIVE_PATH' to service '$SERVICE'..."
docker compose cp "$ARCHIVE_PATH" "$SERVICE":"$DEST_PATH"

echo "Running import-papers on '$DEST_PATH'..."
docker compose exec "$SERVICE" ./import-papers "$DEST_PATH"

echo "Cleaning up temporary file in container..."
docker compose exec "$SERVICE" rm -f "$DEST_PATH"

echo "Done!"
