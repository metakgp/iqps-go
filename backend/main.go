package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	"github.com/rs/cors"

	_ "github.com/mattn/go-sqlite3"
)

type QuestionPaper struct {
	ID          int    `json:"id"`
	CourseCode  string `json:"course_code"`
	CourseName  string `json:"course_name"`
	Year        int    `json:"year"`
	Exam        string `json:"exam"`
	FileLink    string `json:"filelink"`
	FromLibrary bool   `json:"from_library"`
}

var (
	db             *sql.DB
	staticFilesUrl string
)

const init_db = `
CREATE TABLE IF NOT EXISTS qp (
	id INTEGER PRIMARY KEY,
	course_code TEXT NOT NULL DEFAULT '',
	course_name TEXT NOT NULL,
	year INTEGER NOT NULL,
	exam TEXT CHECK (exam IN ('midsem', 'endsem') OR exam = '') DEFAULT '',
	filelink TEXT NOT NULL,
	from_library BOOLEAN DEFAULT 0
);
`

func health(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Yes, I'm alive!")
}

func year(w http.ResponseWriter, r *http.Request) {
	min := db.QueryRow("SELECT MIN(year) FROM qp")
	max := db.QueryRow("SELECT MAX(year) FROM qp")

	var minYear, maxYear int
	err := min.Scan(&minYear)
	if err != nil {
		minYear = time.Now().Year()
	}
	err = max.Scan(&maxYear)
	if err != nil {
		maxYear = time.Now().Year()
	}

	http.Header.Add(w.Header(), "content-type", "application/json")
	err = json.NewEncoder(w).Encode(map[string]int{"min": minYear, "max": maxYear})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func library(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT * FROM qp WHERE from_library = 'true'")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var qps []QuestionPaper = make([]QuestionPaper, 0)
	for rows.Next() {
		qp := QuestionPaper{}
		err := rows.Scan(&qp.ID, &qp.CourseCode, &qp.CourseName, &qp.Year, &qp.Exam, &qp.FileLink, &qp.FromLibrary)
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

func search(w http.ResponseWriter, r *http.Request) {
	course := r.URL.Query().Get("course")
	if course == "" {
		http.Error(w, "course is required", http.StatusBadRequest)
		return
	}
	query := fmt.Sprintf(`SELECT * FROM qp WHERE course_name like '%%?%%' OR course_code like '%%?%%'`)
	params := []string{course, course}
	year := r.URL.Query().Get("year")
	if year != "" {
		yearInt, err := strconv.Atoi(year)
		if err != nil {
			http.Error(w, "year must be a number", http.StatusBadRequest)
			return
		}
		query = fmt.Sprintf(`%s AND year = ?`, query)
		params = append(params, strconv.Itoa(yearInt))
	}

	exam := r.URL.Query().Get("exam")
	if exam != "" {
		query = fmt.Sprintf(`%s AND exam = '?'`, query)
		params = append(params, exam)
	}

	rows, err := db.Query(query, params)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var qps []QuestionPaper = make([]QuestionPaper, 0)
	for rows.Next() {
		qp := QuestionPaper{}
		err := rows.Scan(&qp.ID, &qp.CourseCode, &qp.CourseName, &qp.Year, &qp.Exam, &qp.FileLink, &qp.FromLibrary)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		qp.FileLink = fmt.Sprintf("%s/%s", staticFilesUrl, url.PathEscape(qp.FileLink))
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
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal(err)
	}

	dbPath := os.Getenv("DB_PATH")
	staticFilesUrl = os.Getenv("STATIC_FILES_URL")

	db, err = sql.Open("sqlite3", dbPath)

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
	http.HandleFunc("/year", year)
	http.HandleFunc("/library", library)

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"https://beta.qp.metakgp.org", "http://localhost:3000"},
	})

	fmt.Println("Starting server on port 5000")
	err = http.ListenAndServe(":5000", c.Handler(http.DefaultServeMux))
	if errors.Is(err, http.ErrServerClosed) {
		fmt.Printf("server closed\n")
	} else if err != nil {
		fmt.Printf("error starting server: %s\n", err)
		panic(err)
	}
}
