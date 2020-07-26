FROM nginx:mainline
RUN mkdir -p /var/www/static/

COPY nginx.conf /etc/nginx/
COPY iqps.conf /etc/nginx/sites-enabled/
RUN rm /etc/nginx/conf.d/default.conf
