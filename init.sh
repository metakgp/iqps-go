echo "Starting app"
docker-compose up -d

echo "Running Database Migrations"

docker-compose run web python manage.py migrate --skip-checks

echo "Creating Django superuser"

docker-compose run web python manage.py createsuperuser

echo "Saving Static Files"

docker-compose run web python manage.py collectstatic

echo "Initiation completed successfully"
echo "Shutting down containers"

docker-compose down

echo "To run the app, run in this directory:"
echo 'docker-compose up -d'

