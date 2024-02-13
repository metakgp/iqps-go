#!/bin/bash

cleanup() {
	echo "Container stopped. Removing nginx configuration."
	rm /etc/nginx/sites-enabled/iqps.metaploy.conf
}

trap 'cleanup' SIGQUIT SIGTERM SIGHUP

"${@}" &

cp /iqps.metaploy.conf /etc/nginx/sites-enabled

wait $!

echo "lmao"