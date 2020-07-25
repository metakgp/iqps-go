#!/usr/bin/env bash

set -xe

echo "Backing up database..."

set -a
source .env
set +a

backup_to_dropbox="/usr/local/bin/python /root/backup_to_dropbox.py"

timestamp=$(date +%Y_%m_%d_%H_%M_%S)
backups_path="/root/backups"
backup_dir="iqps_${timestamp}"
backup_file="${backup_dir}.tar.gz"
mkdir -p "$backups_path/$backup_dir"

mysqldump -h db -u iqps_admin -p$MYSQL_PASSWORD iqps > "$backups_path/$backup_dir/iqps_db.sql"

cd $backups_path
tar -czvf $backup_file $backup_dir
rm -rf $backup_dir
$backup_to_dropbox $backup_file
