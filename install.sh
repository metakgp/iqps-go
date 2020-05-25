echo -e

#Check if required commands are present or not
if (command -v python3) && (command -v docker) && (command -v docker-compose) && (command -v sed) && (command -v cp); then
    echo "All commands exists"
else
    echo "Make sure python3, docker, docker-compose, cp and sed are in your PATH"
fi

#Check if credentials and token are present or not
CRED_FILE="iqps/conf/credentials.json"
TOKEN_FILE="iqps/conf/token.pickle"

if test -f "$CRED_FILE"; then
    echo "Credentials Found"
else
    echo "Get the credentials file from https://developers.google.com/drive/api/v3/quickstart/python. Set desktop application as credentials type and move the file to iqps/conf/"
    exit
fi

if test -f "$TOKEN_FILE"; then
    echo "Token File found"
else
    echo "Generating token file......"
    echo "  Creating Python environment"
    python3 -m pip install virtualenv
    python3 -m virtualenv mini_venv
    echo "  Installing dependencies"
    mini_venv/bin/pip3 install -r mini_requirements.txt
    echo "  Authorizing application."
    mini_venv/bin/python3 -c "import os; os.chdir('iqps'); from upload.google_connect import connect; connect()"
    echo "  Cleaning up"
    rm -rf mini_venv

    echo "You might want to run this script again to complete the installation once you have moved the files to the app server."
    echo "Just re-run here if you want to setup a localhost"
    exit
fi

echo "Generating docker-compose.yml and app.env"

cp docker-compose.yml.template docker-compose.yml
cp iqps/conf/app.env.template iqps/conf/app.env

CONF_PATH="iqps/conf/app.env"

echo -n "App mode? (dev|prod): "
read APP_MODE

sed -i "s/mode/$APP_MODE/" $CONF_PATH

echo -n "Secret Key for the app? (Random long cryptographically secure string): "
read APP_SECRET_KEY

sed -i "s/secret_key/$APP_SECRET_KEY/" $CONF_PATH

echo -n "DNS name of the app? (At least give the IP address if you don't have one yet): "
read APP_CNAME

sed -i "s/hostcname/$APP_CNAME/" $CONF_PATH

echo "Database will be connected as user: 'iqps_admin'"
echo -n "Password for iqps_admin? : "
read -s APP_DB_USER_PWD
echo -e

sed -i "s/DB_PWD/$APP_DB_USER_PWD/" $CONF_PATH
sed -i "s/DB_PWD/$APP_DB_USER_PWD/" docker-compose.yml

echo -n "Database root user password? : "
read -s APP_DB_PWD
echo -e

sed -i "s/DB_ROOT_PWD/$APP_DB_PWD/" docker-compose.yml

echo -n "Google Drive Directory name for storing uploaded data? (Be sure to make the directory at a root level in the account of who authorized this app): "
read APP_GDRIVE_DIR

sed -i "s/iqps_static/$APP_GDRIVE_DIR/" $CONF_PATH

echo -n "Local path to store static files? (Give absolute path and make sure current user has write access to it): "
read APP_STATIC_ROOT

mkdir -p $APP_STATIC_ROOT
sed -i "s+local_static_root_path+$APP_STATIC_ROOT+" docker-compose.yml

echo -n "Local path to store logs? (Give absolute path and make sure current user has write access to it): "
read APP_LOG_PATH

mkdir -p $APP_LOG_PATH
sed -i "s+local_log_path+$APP_LOG_PATH+" docker-compose.yml

echo -n "Local path to store data from database? (Give absolute path and make sure current user has write access to it): "
read APP_DATA_DB_PATH

mkdir -p $APP_DATA_DB_PATH
sed -i "s+local_db_data_path+$APP_DATA_DB_PATH+" docker-compose.yml

echo "Attempting to start docker service.... (Requires sudo)"
sudo systemctl restart docker

echo "Building Container"

docker-compose build

echo "Running for the first time... Creates all required volumes"
echo "Takes 5-10 minutes... Have patience :-)"
echo "When output says DB is ready to receive connections, hit CTRL+C and move on to run init.sh"

sleep 5 #So that user reads the above lines properly

docker-compose up


