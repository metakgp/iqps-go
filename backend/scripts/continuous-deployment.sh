#!/bin/bash

## Change the directory to where the script resides
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR" >/dev/null 2>&1 ||
    { echo "[ERROR]: Failed to cd into 'scripts' directory" && exit 1; }

## Move to root direcotry of the project - iqps-go
cd ../../ >/dev/null 2>&1 ||
    { echo "[ERROR]: Failed to cd into 'iqps-go' directory" && exit 1; }

### Sync with remote repository
sudo git fetch origin ||
    { echo "[ERROR]: Failed to fetch origin" && exit 1; }
sudo git reset --hard origin/main ||
    { echo "[ERROR]: Failed to sync with remote repo" && exit 1; }

## Move to backend subdirectory
cd backend/ >/dev/null 2>&1 ||
    { echo "[ERROR]: Failed to cd into 'backend' directory" && exit 1; }

### Build Stage
sudo docker compose build ||
    { echo "[ERROR]: Build stage failed" && exit 1; }

### Deploy Stage
sudo docker compose down ||
    { echo "[ERROR]: Failed to takedown the previous deployment" && exit 1; }
sudo docker compose up -d ||
    { echo "[ERROR]: Failed to deploy the latest version" && exit 1; }
