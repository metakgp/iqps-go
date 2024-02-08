package main

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"

	_ "github.com/mattn/go-sqlite3"
)

func health(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Yes, I'm alive!")
}

func main() {

	db, err := sql.Open("sqlite3", "iqps.db")
	if err != nil {
		log.Fatal(err)
	}

	defer db.Close()

	var version string
	err = db.QueryRow("SELECT SQLITE_VERSION();").Scan(&version)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(version)

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
