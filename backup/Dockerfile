FROM python:2-slim
RUN apt-get update
RUN apt-get install -y cron
RUN apt-get install -y default-mysql-client
RUN apt-get install -y rsync

ENV TZ=Asia/Kolkata
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY backup-cron /etc/cron.d/
RUN chmod 0644 /etc/cron.d/backup-cron

COPY run_cron.sh run_backup.sh backup_to_dropbox.py requirements.txt /root/
WORKDIR /root
RUN pip install -r requirements.txt

VOLUME /var/log

CMD ["./run_cron.sh"]
