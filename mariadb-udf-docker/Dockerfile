FROM mariadb:latest

COPY ./init.sql /docker-entrypoint-initdb.d/init.sql
COPY ./mariadb.service /etc/systemd/system/mariadb.service
COPY ./bitap.so /usr/lib/mysql/plugin/bitap.so
