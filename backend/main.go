package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"github.com/rs/cors"

	_ "github.com/lib/pq"
)

type contextKey string

const claimsKey = contextKey("claims")

type QuestionPaper struct {
	ID              int    `json:"id,omitempty"`
	CourseCode      string `json:"course_code,omitempty"`
	CourseName      string `json:"course_name,omitempty"`
	Year            int    `json:"year,omitempty"`
	Exam            string `json:"exam,omitempty"`
	FileLink        string `json:"filelink,omitempty"`
	FromLibrary     bool   `json:"from_library,omitempty"`
	UploadTimestamp string `json:"upload_timestamp,omitempty"`
	ApproveStatus   bool   `json:"approve_status,omitempty"`
	CourseDetails   string `json:"course_details,omitempty"`
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
	gh_pubKey                  string
	gh_pvtKey                  string
	jwt_secret                 string
	org_name                   string
	org_team                   string
	gh_org_admin_token         string
)

type GhOAuthReqBody struct {
	GhCode string `json:"code"`
}

type GithubAccessTokenResponse struct {
	AccessToken string `json:"access_token"`
	Scope       string `json:"scope"`
	TokenType   string `json:"token_type"`
}

type GithubUserResponse struct {
	Login string `json:"login"`
	ID    int    `json:"id"`
}

var respData struct {
	Token string `json:"token"`
}

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

func listUnapprovedPapers(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT course_code, course_name, year, exam, filelink FROM qp WHERE approve_status = false ORDER BY upload_timestamp ASC")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var qps []QuestionPaper = make([]QuestionPaper, 0)
	for rows.Next() {
		qp := QuestionPaper{}
		err := rows.Scan(&qp.CourseCode, &qp.CourseName, &qp.Year, &qp.Exam, &qp.FileLink)
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

func upload(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var response []uploadEndpointRes = make([]uploadEndpointRes, 0)
	// Max total size of 50MB
	const MaxBodySize = 50 << 20 // 1<<20  = 1024*1024 = 1MB
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodySize)

	err := r.ParseMultipartForm(MaxBodySize)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	maxLimit, err := strconv.Atoi(os.Getenv("MAX_UPLOAD_LIMIT"))
	if err != nil || maxLimit < 1 {
		maxLimit = 10
	}

	files := r.MultipartForm.File["files"]
	log.Printf("/upload: Received %d files.", len(files))
	if len(files) > maxLimit {
		http.Error(w, fmt.Sprintf("maximum %d files allowed", maxLimit), http.StatusBadRequest)
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

func GhAuth(w http.ResponseWriter, r *http.Request) {
	ghOAuthReqBody := GhOAuthReqBody{}
	if err := json.NewDecoder(r.Body).Decode(&ghOAuthReqBody); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if ghOAuthReqBody.GhCode == "" {
		http.Error(w, "Github OAuth Code cannot be empty", http.StatusBadRequest)
		return
	}

	// Get the access token for authenticating other endpoints
	uri := fmt.Sprintf("https://github.com/login/oauth/access_token?client_id=%s&client_secret=%s&code=%s", gh_pubKey, gh_pvtKey, ghOAuthReqBody.GhCode)

	req, _ := http.NewRequest("POST", uri, nil)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error Getting Github Access Token: ", err.Error())
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Decode the response
	var tokenResponse GithubAccessTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		fmt.Println("Error Decoding Github Access Token: ", err.Error())
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Get the username of the user who made the request
	req, _ = http.NewRequest("GET", "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+tokenResponse.AccessToken)

	resp, err = client.Do(req)
	if err != nil {
		fmt.Println("Error getting username: ", err.Error())
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Decode the response
	var userResponse GithubUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&userResponse); err != nil {
		fmt.Println("Error decoding username: ", err.Error())
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	uname := userResponse.Login
	// check if uname is empty
	if uname == "" {
		http.Error(w, "No user found", http.StatusUnauthorized)
		return
	}

	// Send request to check status of the user in the given org's team
	url := fmt.Sprintf("https://api.github.com/orgs/%s/teams/%s/memberships/%s", org_name, org_team, uname)
	req, _ = http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+gh_org_admin_token)
	resp, err = client.Do(req)

	var checkResp struct {
		State string `json:"state"`
	}

	if err != nil {
		fmt.Println("Error validating user membership: ", err.Error())
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	defer resp.Body.Close()
	// decode the response
	if err := json.NewDecoder(resp.Body).Decode(&checkResp); err != nil {
		fmt.Println("Error decoding gh validation body: ", err.Error())
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Check if user is present in the team
	if checkResp.State != "active" {

		http.Error(w, "User is not authenticated", http.StatusUnauthorized)
		return
	}

	// Create the response JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": uname,
	})

	tokenString, err := token.SignedString([]byte(jwt_secret))
	if err != nil {
		fmt.Println("Error Sigining JWT: ", err.Error())
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	http.Header.Add(w.Header(), "content-type", "application/json")

	// Send the response

	respData.Token = tokenString
	err = json.NewEncoder(w).Encode(&respData)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func JWTMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// get the authorisation header
		tokenString := r.Header.Get("Authorization")
		if tokenString == "" {
			w.WriteHeader(http.StatusUnauthorized)
			fmt.Fprint(w, "Missing authorization header")
			return
		}
		JWTtoken := strings.Split(tokenString, " ")

		if len(JWTtoken) != 2 {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprint(w, "Authorisation head is of incorrect type")
			return
		}
		// parse the token
		token, err := jwt.Parse(JWTtoken[1], func(t *jwt.Token) (interface{}, error) {
			if _, OK := t.Method.(*jwt.SigningMethodHMAC); !OK {
				return nil, errors.New("bad signed method received")
			}

			return []byte(jwt_secret), nil
		})
		// Check if error in parsing jwt token
		if err != nil {
			http.Error(w, "Bad JWT token", http.StatusUnauthorized)
			return
		}
		// Get the claims
		claims, ok := token.Claims.(jwt.MapClaims)

		if ok && token.Valid && claims["username"] != nil {
			// If valid claims found, send response
			ctx := context.WithValue(r.Context(), claimsKey, claims)
			handler.ServeHTTP(w, r.WithContext(ctx))
		} else {
			http.Error(w, "Invalid JWT token", http.StatusUnauthorized)
		}
	})
}

func CheckError(err error) {
	if err != nil {
		panic(err)
	}
}

func LoadGhEnv() {
	gh_pubKey = os.Getenv("GH_CLIENT_ID")
	gh_pvtKey = os.Getenv("GH_PRIVATE_ID")
	org_name = os.Getenv("GH_ORG_NAME")
	org_team = os.Getenv("GH_ORG_TEAM_SLUG")
	gh_org_admin_token = os.Getenv("GH_ORG_ADMIN_TOKEN")

	jwt_secret = os.Getenv("JWT_SECRET")

	if gh_pubKey == "" {
		panic("Client id for Github OAuth cannot be empty")
	}
	if gh_pvtKey == "" {
		panic("Client Private Key for Github OAuth cannot be empty")
	}
	if org_name == "" {
		panic("Organisation name cannot be empty")
	}
	if org_team == "" {
		panic("Team name of the Organistion cannot be empty")
	}
	if jwt_secret == "" {
		panic("JWT Secret Key cannot be empty")
	}
	if gh_org_admin_token == "" {
		panic("Github Organisation Admin Token cannot be empty")
	}
}

func main() {
	godotenv.Load()
	host := os.Getenv("DB_HOST")
	port, err := strconv.Atoi(os.Getenv("DB_PORT"))
	CheckError(err)

	LoadGhEnv()

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
	http.HandleFunc("POST /upload", upload)
	http.HandleFunc("POST /oauth", GhAuth)
	http.Handle("GET /unapproved", JWTMiddleware(http.HandlerFunc(listUnapprovedPapers)))

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
