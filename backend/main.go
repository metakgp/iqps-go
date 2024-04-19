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
	"time"

	"github.com/joho/godotenv"
	"github.com/rs/cors"

	_ "github.com/lib/pq"
)

type QuestionPaper struct {
	ID              int    `json:"id"`
	CourseCode      string `json:"course_code"`
	CourseName      string `json:"course_name"`
	Year            int    `json:"year"`
	Exam            string `json:"exam"`
	FileLink        string `json:"filelink"`
	FromLibrary     bool   `json:"from_library"`
	UploadTimestamp string `json:"upload_timestamp"`
	ApproveStatus   bool   `json:"approve_status"`
}

var (
	db             *sql.DB
	staticFilesUrl string
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
    approve_status BOOLEAN DEFAULT FALSE
);
`

const (
	host     = "localhost"
	port     = 5432
	user     = "postgres"
	password = "<password>"
	dbname   = "postgres"
)

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

	query := `SELECT id,course_code,course_name,year,exam,filelink,from_library,upload_timestamp,approve_status FROM qp WHERE course_code_tsvector @@ websearch_to_tsquery('english', $1)`
	var params []interface{}
	params = append(params, course)

	exam := r.URL.Query().Get("exam")
	if exam != "" {
		query = fmt.Sprintf(`%s AND (exam = $2 OR exam = '')`, query)
		params = append(params, exam)
	}

	rows, err := db.Query(query, params...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var qps []QuestionPaper = make([]QuestionPaper, 0)
	for rows.Next() {
		qp := QuestionPaper{}
		err := rows.Scan(&qp.ID, &qp.CourseCode, &qp.CourseName, &qp.Year, &qp.Exam, &qp.FileLink, &qp.FromLibrary, &qp.UploadTimestamp, &qp.ApproveStatus)
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

func CheckError(err error) {
	if err != nil {
		panic(err)
	}
}

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal(err)
	}

	staticFilesUrl = os.Getenv("STATIC_FILES_URL")

	psqlconn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, dbname)

	db, err = sql.Open("postgres", psqlconn)
	CheckError(err)
	defer db.Close()

	err = db.Ping()
	CheckError(err)

	_, err = db.Exec(init_db)
	if err != nil {
		log.Fatal(err)
	}

	http.HandleFunc("/health", health)
	http.HandleFunc("/search", search)
	http.HandleFunc("/year", year)
	http.HandleFunc("/library", library)

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"https://qp.metakgp.org", "http://localhost:3000"},
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
