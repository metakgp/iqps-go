FROM python:3.6
ENV PYTHONUNBUFFERED 1
RUN apt-get update && apt install -y default-mysql-client
RUN mkdir -p /iqps
RUN mkdir -p /var/www/static
RUN mkdir -p /var/log/iqps
ADD requirements.txt /iqps/
RUN pip install --upgrade pip && pip install -r /iqps/requirements.txt
ADD . /iqps/

WORKDIR /iqps/iqps/
