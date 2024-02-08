package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	_ "github.com/mattn/go-sqlite3"
)

type QuestionPaper struct {
	ID         int    `json:"id"`
	CourseCode string `json:"course_code"`
	CourseName string `json:"course_name"`
	Year       int    `json:"year"`
	Exam       string `json:"exam"`
	FileLink   string `json:"filelink"`
}

var db *sql.DB

const init_db = `
CREATE TABLE IF NOT EXISTS qp (
	id INTEGER PRIMARY KEY,
	course_code TEXT NOT NULL,
	course_name TEXT NOT NULL DEFAULT '',
	year INTEGER NOT NULL,
	exam TEXT CHECK (exam IN ('midsem', 'endsem')) NOT NULL,
	filelink TEXT NOT NULL
);
`

func health(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Yes, I'm alive!")
}

func search(w http.ResponseWriter, r *http.Request) {
	course := r.URL.Query().Get("course")
	if course == "" {
		http.Error(w, "course is required", http.StatusBadRequest)
		return
	}
	year, _ := strconv.Atoi(r.URL.Query().Get("year"))
	exam := r.URL.Query().Get("exam")

	query := fmt.Sprintf(`SELECT * FROM qp WHERE course_name like '%%%s%%' AND year = %d AND exam = '%s';`, course, year, exam)

	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var qps []QuestionPaper
	for rows.Next() {
		var qp = QuestionPaper{}
		err := rows.Scan(&qp.ID, &qp.CourseCode, &qp.CourseName, &qp.Year, &qp.Exam, &qp.FileLink)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		qps = append(qps, qp)
	}

	http.Header.Add(w.Header(), "content-type", "application/json")
	err = json.NewEncoder(w).Encode(&qps)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func main() {

	var err error
	db, err = sql.Open("sqlite3", "iqps.db")

	if err != nil {
		log.Fatal(err)
	}

	defer db.Close()

	_, err = db.Exec(init_db)
	if err != nil {
		log.Fatal(err)
	}

	http.HandleFunc("/health", health)
	http.HandleFunc("/search", search)

	fmt.Println("Starting server on port 5000")
	err = http.ListenAndServe(":5000", nil)
	if errors.Is(err, http.ErrServerClosed) {
		fmt.Printf("server closed\n")
	} else if err != nil {
		fmt.Printf("error starting server: %s\n", err)
		panic(err)
	}
}
