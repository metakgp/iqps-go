package main

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"

	_ "github.com/mattn/go-sqlite3"
)

const init_db = `
CREATE TABLE IF NOT EXISTS qp (
	id INTEGER PRIMARY KEY,
	course_code TEXT NOT NULL,
	course_name TEXT NOT NULL DEFAULT '',
	year INTEGER NOT NULL,
	exam TEXT CHECK (exam IN ('midsem', 'endsem')) NOT NULL,
	filename TEXT NOT NULL
);
`

func health(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Yes, I'm alive!")
}

func main() {

	db, err := sql.Open("sqlite3", "iqps.db")
	if err != nil {
		log.Fatal(err)
	}

	defer db.Close()

	_, err = db.Exec(init_db)
	if err != nil {
		log.Fatal(err)
	}

	http.HandleFunc("/health", health)

	fmt.Println("Starting server on port 5000")
	err = http.ListenAndServe(":5000", nil)
	if errors.Is(err, http.ErrServerClosed) {
		fmt.Printf("server closed\n")
	} else if err != nil {
		fmt.Printf("error starting server: %s\n", err)
		panic(err)
	}
}
