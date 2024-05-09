package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
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
	CourseDetails   string `json:"course_details"`
}

type uploadEndpointRes struct {
	Filename    string `json:"filename"`
	Status      string `json:"status"`
	Description string `json:"description"`
}

var (
	db                         *sql.DB
	staticFilesUrl             string
	staticFilesStorageLocation string
	uploadedQpsPath            string
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

	// query := `SELECT id,course_code,course_name,year,exam,filelink,from_library,upload_timestamp,approve_status FROM qp WHERE course_code_tsvector @@ websearch_to_tsquery('english', $1)`
	query := `SELECT * FROM (SELECT id,course_code,course_name,year,exam,filelink,from_library,upload_timestamp,approve_status FROM qp WHERE course_details_tsvector @@ websearch_to_tsquery('simple', $1)  AND approve_status=true UNION SELECT id,course_code,course_name,year,exam,filelink,from_library,upload_timestamp,approve_status from qp where course_details %>> $1  AND approve_status=true UNION SELECT id,course_code,course_name,year,exam,filelink,from_library,upload_timestamp,approve_status from qp where course_details_tsvector @@ to_tsquery('simple', websearch_to_tsquery('simple', $1)::text || ':*') AND approve_status=true)`

	var params []interface{}
	params = append(params, course)

	exam := r.URL.Query().Get("exam")
	if exam != "" {
		query = fmt.Sprintf(`%s WHERE (exam = $2 OR exam = '')`, query)
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
		qp.FileLink = fmt.Sprintf("%s/%s", staticFilesUrl, qp.FileLink)
		qps = append(qps, qp)
	}

	http.Header.Add(w.Header(), "content-type", "application/json")
	err = json.NewEncoder(w).Encode(&qps)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func upload(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var response []uploadEndpointRes
	// Max total size of 50MB
	const MaxBodySize = 50 << 20 // 1<<20  = 1024*1024 = 1MB
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodySize)

	err := r.ParseMultipartForm(MaxBodySize)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	files := r.MultipartForm.File["files"]
	if len(files) > 7 {
		http.Error(w, "max 7 files allowed", http.StatusBadRequest)
		return
	}

	for _, fileHeader := range files {
		resp := uploadEndpointRes{Filename: fileHeader.Filename, Status: "success"}

		if fileHeader.Size > 10<<20 {
			resp.Status = "failed"
			resp.Description = "file size exceeds 10MB"
			response = append(response, resp)
			continue
		}

		file, err := fileHeader.Open()
		if err != nil {
			resp.Status = "failed"
			resp.Description = err.Error()
			response = append(response, resp)
			continue
		}
		defer file.Close()

		fileType := fileHeader.Header.Get("Content-Type")
		if fileType != "application/pdf" {
			resp.Status = "failed"
			resp.Description = "invalid file type. Only PDFs are supported"
			response = append(response, resp)
			continue
		}

		fileName := fileHeader.Filename

		FileNameList := r.MultipartForm.Value[fileName]
		if len(FileNameList) == 0 {
			resp.Status = "failed"
			resp.Description = "filename not provided"
			response = append(response, resp)
			continue
		}

		newFileName := FileNameList[0]
		filePath := filepath.Join(staticFilesStorageLocation, uploadedQpsPath, newFileName)
		filePath = filePath + ".pdf"
		filePath = filepath.Clean(filePath)

		// Duplicate filename handling
		if _, err = os.Stat(filePath); err == nil {
			for i := 1; true; i++ {
				if _, err := os.Stat(fmt.Sprintf("%s-%d.pdf", filePath[:len(filePath)-4], i)); err == nil {
					continue
				} else if errors.Is(err, os.ErrNotExist) {
					filePath = fmt.Sprintf("%s-%d.pdf", filePath[:len(filePath)-4], i)
					break
				} else {
					resp.Status = "failed"
					resp.Description = err.Error()
					response = append(response, resp)
					continue
				}
			}
		} else if !errors.Is(err, os.ErrNotExist) {
			resp.Status = "failed"
			resp.Description = err.Error()
			response = append(response, resp)
			continue
		}

		dest, err := os.Create(filePath)
		if err != nil {
			resp.Status = "failed"
			resp.Description = err.Error()
			response = append(response, resp)
			continue
		}
		defer dest.Close()

		if _, err := io.Copy(dest, file); err != nil {
			resp.Status = "failed"
			resp.Description = err.Error()
			response = append(response, resp)
			continue
		}

		err = populateDB(newFileName)
		if err != nil {
			_ = os.Remove(filePath)
			resp.Status = "failed"
			resp.Description = err.Error()
			response = append(response, resp)
			continue

		}
		response = append(response, resp)
	}
	// return response to client
	http.Header.Add(w.Header(), "content-type", "application/json")
	err = json.NewEncoder(w).Encode(&response)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func populateDB(filename string) error {
	qpData := strings.Split(filename, "_")
	if len(qpData) != 5 {
		return fmt.Errorf("invalid filename format")
	}

	courseCode := qpData[0]
	courseName := qpData[1]
	courseDetails := strings.Join(strings.Split(filename, "_"), " ")

	year, _ := strconv.Atoi(qpData[2])
	exam := qpData[3]
	fromLibrary := false
	fileLink := filepath.Join(uploadedQpsPath, filename+".pdf")
	query := "INSERT INTO qp (course_code, course_name, year, exam, filelink, from_library,course_details) VALUES ($1, $2, $3, $4, $5, $6,$7);"

	_, err := db.Exec(query, courseCode, courseName, year, exam, fileLink, fromLibrary, courseDetails)
	if err != nil {
		return fmt.Errorf("failed to add qp to database: %v", err)
	}
	return nil
}

func CheckError(err error) {
	if err != nil {
		panic(err)
	}
}

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println(err)
	}

	host := os.Getenv("DB_HOST")
	port, err := strconv.Atoi(os.Getenv("DB_PORT"))
	CheckError(err)
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")

	staticFilesUrl = os.Getenv("STATIC_FILES_URL")
	staticFilesStorageLocation = os.Getenv("STATIC_FILES_STORAGE_LOCATION")
	uploadedQpsPath = os.Getenv("UPLOADED_QPS_PATH")

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
	http.HandleFunc("/upload", upload)

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
