#!/usr/bin/env bash

set -xe

touch /var/log/cron.log
env | grep 'MYSQL\|DROPBOX' > /root/.env
cron && tail -f /var/log/cron.log
