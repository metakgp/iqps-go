package db

import (
	"database/sql"
	"fmt"
	"log"
	"sync"

	"github.com/metakgp/iqps/backend/pkg/config"
)

var (
	database *sql.DB
	mu       sync.Mutex
)

const init_db = `CREATE TABLE IF NOT EXISTS qp (
    id SERIAL PRIMARY KEY,
    course_code TEXT NOT NULL DEFAULT '',
    course_name TEXT NOT NULL,
    year INTEGER NOT NULL,
    exam TEXT CHECK (exam IN ('midsem', 'endsem') OR exam = ''),
    filelink TEXT NOT NULL,
    from_library BOOLEAN DEFAULT FALSE,
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approve_status BOOLEAN DEFAULT FALSE,
		course_details TEXT NOT NULL DEFAULT ''
);
`

func InitDB() *sql.DB {
	var err error
	dbConfig := config.Get().DB
	psqlconn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", dbConfig.Host, dbConfig.Port, dbConfig.Username, dbConfig.Password, dbConfig.DBname)
	database, err = sql.Open("postgres", psqlconn)
	if err != nil {
		panic("Invalid Database connection string")
	}

	err = database.Ping()
	if err != nil {
		panic("Database did not respond to ping")
	}

	_, err = database.Exec(init_db)
	if err != nil {
		log.Fatal("Error initializting database")
	}

	config.Get().Logger.Info("Successfully connected to database")
	return database
}

func GetDB() *sql.DB {
	if database == nil {
		mu.Lock()
		defer mu.Unlock()
		if database == nil {
			database = InitDB()
		}
	}
	return database
}
