#!/bin/bash

## Change the directory to where the script resides
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR" >/dev/null 2>&1 || { echo "[ERROR]: Failed to cd into 'scripts' directory" && exit 1; }

## Move to root direcotry of the project - iqps-go 
cd ../../ >/dev/null 2>&1 || { echo "[ERROR]: Failed to cd into 'iqps-go' directory" && exit 1; }

### Sync with remote repository
sudo git fetch origin
sudo git reset --hard origin/main

## Move to backend subdirectory
cd backend/ >/dev/null 2>&1 || { echo "[ERROR]: Failed to cd into 'backend' directory" && exit 1; }

### Build Stage
sudo docker compose build

### Deploy Stage
sudo docker compose down
sudo docker compose up -d
