package config

import (
	"os"
	"strconv"

	"github.com/sirupsen/logrus"
	"gopkg.in/natefinch/lumberjack.v2"
)

type Config struct {
	DB                         databaseConfig
	GithubSecrets              githubSecrets
	JWTSecret                  string
	StaticFilesUrl             string
	StaticFilesStorageLocation string
	UploadedQPsPath            string
	MaxUploadLimit             int
	Logger                     *logrus.Logger
}

type githubSecrets struct {
	PublicKey     string
	PrivateKey    string
	OrgName       string
	OrgTeam       string
	OrgAdminToken string
}

type databaseConfig struct {
	Host     string
	Username string
	Password string
	DBname   string
	Port     uint
}

var config *Config

func Get() *Config {
	if config != nil {
		return config
	}

	var pgConf databaseConfig
	port, err := strconv.ParseUint(os.Getenv("DB_PORT"), 10, 32)
	if err != nil {
		panic(err)
	}
	pgConf = databaseConfig{
		DBname:   os.Getenv("DB_NAME"),
		Username: os.Getenv("DB_USER"),
		Password: os.Getenv("DB_PASSWORD"),
		Host:     os.Getenv("DB_HOST"),
		Port:     uint(port),
	}

	githubSecrets := githubSecrets{
		PublicKey:     os.Getenv("GH_CLIENT_ID"),
		PrivateKey:    os.Getenv("GH_PRIVATE_ID"),
		OrgName:       os.Getenv("GH_ORG_NAME"),
		OrgTeam:       os.Getenv("GH_ORG_TEAM_SLUG"),
		OrgAdminToken: os.Getenv("GH_ORG_ADMIN_TOKEN"),
	}

	maxUploadLimit, err := strconv.Atoi(os.Getenv("MAX_UPLOAD_LIMIT"))
	if err != nil || maxUploadLimit < 1 {
		maxUploadLimit = 10
	}

	log := logrus.New()
	log.SetOutput(&lumberjack.Logger{
		Filename: "~/iqps/logs/application.log",
		MaxSize:  10, // Max size in MB
	})

	config = &Config{
		DB:                         pgConf,
		GithubSecrets:              githubSecrets,
		JWTSecret:                  os.Getenv("JWT_SECRET"),
		StaticFilesUrl:             os.Getenv("STATIC_FILES_URL"),
		StaticFilesStorageLocation: os.Getenv("STATIC_FILES_STORAGE_LOCATION"),
		UploadedQPsPath:            os.Getenv("UPLOADED_QPS_PATH"),
		Logger:                     log,
		MaxUploadLimit:             maxUploadLimit,
	}
	config.Logger.Info("config successfully setup")
	return config
}
