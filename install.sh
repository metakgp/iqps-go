 
echo -e

#Checkpoint 0
#Check if required commands are present or not
if (command -v python3) && (command -v docker) && (command -v docker-compose) && (command -v sed) && (command -v cp) && (command -v make) && (command -v g++); then
    echo "All commands exists"
else
    echo "Make sure python3, docker, docker-compose, cp, sed, make and g++ are in your PATH"
fi



#Checkpoint 1
#Check if credentials and token are present or not
CRED_FILE="iqps/conf/credentials.json"  #Downloaded credentials file (Google Drive API)
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
    python3 -m venv mini_venv
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

echo "Building mariadb-udf image"

make -C ./mariadb-udf-docker/

echo "Generating docker-compose.yml and app.env"

cp docker-compose.yml.template docker-compose.yml
cp iqps/conf/app.env.template iqps/conf/app.env

# sed -i '43,51d' docker-compose.yml
# sed -i '17 a \ \ \ \ ports:' docker-compose.yml
# sed -i '18 a \ \ \ \ \ \ - 8000:80' docker-compose.yml

CONF_PATH="iqps/conf/app.env"
declare -a array=("App mode : " 
                  "Secret Key for the app : " 
                  "Password for iqps_admin : "
                  "Database root user password : "
                  "Google drive directory name for storing uploaded data : " 
                  "Local path to store static files : "
                  "Local path to store logs : "
                  "Local path to store data from database : "
                  "Dropbox consent : "
                  "Dropbox access token : ");

declare -a arrayques=("App mode? (dev|prod): " 
                  "Secret Key for the app? (Random long cryptographically secure string): " 
                  "Password for iqps_admin? : "
                  "Database root user password? : "
                  "Google Drive Directory name for storing uploaded data? (Be sure to make the directory at a root level in the account of who authorized this app): " 
                  "Local path to store static files? (Give absolute path and make sure current user has write access to it): "
                  "Local path to store logs? (Give absolute path and make sure current user has write access to it): "
                  "Local path to store data from database? (Give absolute path and make sure current user has write access to it): "
                  "Do you want Dropbox backup?(y|n)"
                  "Dropbox access token? ");


file=".variable.txt";   # The hidden backup file
lines_in_file=0;        # The number of lines in the hidden backup file
COLUMNS=$(tput cols)    # For formatted printing
backup_found=0;         # Checks for the presence of the variable file
if test -f $file; then
    lines_in_file=$(sed -n '$=' .variable.txt);
    backup_found=1;
else
    lines_in_file=0
fi

printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
title="Checking for backups" 
printf "%*s\n" $(((${#title}+$COLUMNS)/2)) "$title"
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

# echo $lines_in_file
if [[ $backup_found == 1 ]]; then
    echo -n "Backup found! (Press [y|Y] to use or any other key to start afresh) : "
    read -n 1 entry;
    echo -e;
    if [[ $entry == 'y' || $entry == 'Y' ]]; then        
        backup_found=0;
    else
        lines_in_file=0;
        rm -f .variable.txt
    fi
else    
    echo -e "No backup found! Proceeding...\n";
fi

printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
#Checkpoint 2
i=1
APP_MODE="";
if [ $i -le $lines_in_file ]; then
    APP_MODE=$(sed -n "$i p" $file);
    echo "${array[$(($i-1))]}[$APP_MODE]"; 
else 
    echo -n "${arrayques[$(($i-1))]}"
    # read APP_MODE;
    APP_MODE=dev
    echo $APP_MODE >> $file;    
fi
sed -i "s/mode/$APP_MODE/" $CONF_PATH
i=$(($i+1));
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

#Checkpoint 3
APP_SECRET_KEY="";
if [ $i -le $lines_in_file ]; then
    APP_SECRET_KEY=$(sed -n "$i p" $file);
    echo "${array[$(($i-1))]}[$APP_SECRET_KEY]"    
else 
    echo -n "${arrayques[$(($i-1))]}"
    # read APP_SECRET_KEY;
    APP_SECRET_KEY="alkjdlajkasd"
    echo $APP_SECRET_KEY >> $file;
fi
sed -i "s/secret_key/$APP_SECRET_KEY/" $CONF_PATH
i=$(($i+1));
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

#Checkpoint 4
echo "Database will be connected as user: 'iqps_admin'"
APP_DB_USER_PWD="";
if [ $i -le $lines_in_file ]; then
    APP_DB_USER_PWD=$(sed -n "$i p" $file);
    echo "${array[$(($i-1))]}[$APP_DB_USER_PWD]"    
else 
    echo -n "${arrayques[$(($i-1))]}"
    # read APP_DB_USER_PWD;
    APP_DB_USER_PWD="1234"
    echo $APP_DB_USER_PWD >> $file;
fi
sed -i "s/DB_PWD/$APP_DB_USER_PWD/" $CONF_PATH
sed -i "s/DB_PWD/$APP_DB_USER_PWD/g" docker-compose.yml
i=$(($i+1));
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

#Checkpoint 5
APP_DB_PWD="";
if [ $i -le $lines_in_file ]; then
    APP_DB_PWD=$(sed -n "$i p" $file);
    echo "${array[$(($i-1))]}[$APP_DB_PWD]"    
else 
    echo -n "${arrayques[$(($i-1))]}"
    # read APP_DB_PWD;
    APP_DB_PWD="1234"
    echo $APP_DB_PWD >> $file;
fi
sed -i "s/DB_ROOT_PWD/$APP_DB_PWD/g" docker-compose.yml
i=$(($i+1));
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

#Checkpoint 6
APP_GDRIVE_DIR="";
if [ $i -le $lines_in_file ]; then
    APP_GDRIVE_DIR=$(sed -n "$i p" $file);
    echo "${array[$(($i-1))]}[$APP_GDRIVE_DIR]"    
else 
    echo -n "${arrayques[$(($i-1))]}"
    # read APP_GDRIVE_DIR;
    APP_GDRIVE_DIR="iqps_static"
    echo $APP_GDRIVE_DIR >> $file;
fi
sed -i "s/iqps_static/$APP_GDRIVE_DIR/" $CONF_PATH
i=$(($i+1));
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

#Checkpoint 7
APP_STATIC_ROOT="";
if [ $i -le $lines_in_file ]; then
    APP_STATIC_ROOT=$(sed -n "$i p" $file);
    echo "${array[$(($i-1))]}[$APP_STATIC_ROOT]"    
else 
    echo -n "${arrayques[$(($i-1))]}"
    # read APP_STATIC_ROOT;
    APP_STATIC_ROOT="${pwd}/local-data/qps"
    echo $APP_STATIC_ROOT >> $file;
fi
mkdir -p $APP_STATIC_ROOT
sed -i "s+local_static_root_path+$APP_STATIC_ROOT+g" docker-compose.yml    
i=$(($i+1));
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

#Checkpoint 8
APP_LOG_PATH="";
if [ $i -le $lines_in_file ]; then
    APP_LOG_PATH=$(sed -n "$i p" $file);
    echo "${array[$(($i-1))]}[$APP_LOG_PATH]"    
else 
    echo -n "${arrayques[$(($i-1))]}"
    # read APP_LOG_PATH;
    APP_LOG_PATH="${pwd}/local-data/logs"
    echo $APP_LOG_PATH >> $file;
fi
mkdir -p $APP_LOG_PATH
sed -i "s+local_log_path+$APP_LOG_PATH+g" docker-compose.yml    
i=$(($i+1));
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

#Checkpoint 9   
APP_DATA_DB_PATH="";
if [ $i -le $lines_in_file ]; then
    APP_DATA_DB_PATH=$(sed -n "$i p" $file);
    echo "${array[$(($i-1))]}[$APP_LOG_PATH]"    
else 
    echo -n "${arrayques[$(($i-1))]}"
    # read APP_DATA_DB_PATH;
    APP_DATA_DB_PATH="${pwd}/local-data/database"
    echo $APP_DATA_DB_PATH >> $file;
fi
echo "ME HERE!!!!"
whoami
mkdir -p $APP_DATA_DB_PATH
sudo chown -R $(whoami):$(whoami) ${APP_DATA_DB_PATH}/*
sed -i "s+local_db_data_path+$APP_DATA_DB_PATH+" docker-compose.yml
i=$(($i+1));
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

#Checkpoint 10
BACKUP_CONSENT="";
if [ $i -le $lines_in_file ]; then
    BACKUP_CONSENT=$(sed -n "$i p" $file);
    echo "${array[$(($i-1))]}[$BACKUP_CONSENT]"    
else 
    echo -n "${arrayques[$(($i-1))]}"
    read BACKUP_CONSENT;
    echo $BACKUP_CONSENT >> $file;
fi
i=$(($i+1));
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

if [ $BACKUP_CONSENT = "y" ]
then
    APP_DROPBOX_ACCESS_TOKEN="";
    if [ $i -le $lines_in_file ]; then
        echo -e "\tDropbox access already given!"
        APP_DROPBOX_ACCESS_TOKEN=$(sed -n "$i p" $file);
        echo "${array[$(($i-1))]}[$APP_LOG_PATH]"    
    else 
        echo -n "${arrayques[$(($i-1))]}"
        read APP_DROPBOX_ACCESS_TOKEN;
        echo $APP_DROPBOX_ACCESS_TOKEN >> $file;
    fi
    sed -i "s/DROPBOX_TOKEN/$APP_DROPBOX_ACCESS_TOKEN/" docker-compose.yml
    i=$(($i+1));
else
    echo "Backup consent not given. Please delete the last 10 lines (backup section) from docker-compose.yml"
fi
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
title="Information Collected Successfully" 
printf "%*s\n" $(((${#title}+$COLUMNS)/2)) "$title"
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

# echo "Attempting to start docker service.... (Requires sudo)"
# sudo systemctl restart docker

# Deletes the hidden .txt file
echo "Deleting backup file";
rm -f ".variable.txt"

#Default Checkpoint
echo "Building Container"

docker-compose build

echo "Running for the first time... Creates all required volumes"
echo "Takes 5-10 minutes... Have patience :-)"
echo "When output says DB is ready to receive connections, hit CTRL+C and move on to run init.sh"

sleep 5 #So that user reads the above lines properly

docker-compose up

if test -f ".log.txt"; then
    sed -i 's/mysqld: ready for connections/mysqld: was ready for connections/gI' .log.txt
else
    docker-compose logs --no-color > ".log.txt";
    sed -i 's/mysqld: ready for connections/mysqld: was ready for connections/gI' .log.txt
fi

lines=0
seen=0
while [ $seen -eq 0 ]
do
    sleep 5
    docker-compose logs --no-color > ".log.txt";
    input=".log.txt";
    STR="mysqld: ready for connections";
    while IFS= read -r line
    do
        if grep -q "$STR" <<< "$line"; then
            echo "It is there. You can exit!";
            seen=1
            break        
        fi
    done < "$input"
    if [ $seen -eq 1 ]; then
        break;
    fi
done

if [ $seen -eq 1 ]; then
    echo "Killing docker-compose!";
    docker-compose stop;
fi

echo "RUNNING INIT.SH"
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
echo 'docker-compose up'

rm .log.txt
