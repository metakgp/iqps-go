package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/metakgp/iqps/backend/pkg/config"
	"github.com/metakgp/iqps/backend/pkg/db"
	"github.com/metakgp/iqps/backend/query"
)

type contextKey string

const (
	CLAIMS_KEY           = contextKey("claims")
	AUTHORIZATION_HEADER = "authorization"
)

type httpResp struct {
	Status  string      `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}
type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func HandleHealthCheck(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Yes, I'm alive!")
}

func HandleQPYear(w http.ResponseWriter, r *http.Request) {
	db := db.GetDB()
	result := db.QueryRow(context.Background(), "SELECT MIN(year), MAX(year) FROM iqps")
	var minYear, maxYear int
	err := result.Scan(&minYear, &maxYear)
	if err != nil {
		config.Get().Logger.Info("HandleQPYear: No min and max year in database, setting to default")
		minYear = time.Now().Year()
		maxYear = time.Now().Year()
	}

	sendResponse(w, http.StatusOK, map[string]int{"min": minYear, "max": maxYear})
}

func HandleLibraryPapers(w http.ResponseWriter, r *http.Request) {
	db := db.GetDB()
	rows, err := db.Query(context.Background(), "SELECT * FROM iqps WHERE from_library = 'true'")
	if err != nil {
		sendErrorResponse(w, http.StatusInternalServerError, "Could not Query Question Paper, Try Later!", nil)
		return
	}
	defer rows.Close()

	var qps []QuestionPaper = make([]QuestionPaper, 0)
	for rows.Next() {
		qp := QuestionPaper{}
		err := rows.Scan(&qp.ID, &qp.CourseCode, &qp.CourseName, &qp.Year, &qp.Exam, &qp.FileLink, &qp.FromLibrary)
		if err != nil {
			sendErrorResponse(w, http.StatusInternalServerError, "error parsing question paper details, contact admin ", nil)
			config.Get().Logger.Error("HandleLibraryPapers: Error in parsing question paper details")
			return
		}
		qps = append(qps, qp)
	}
	sendResponse(w, http.StatusOK, qps)
}

func HandleQPSearch(w http.ResponseWriter, r *http.Request) {
	db := db.GetDB()
	course := r.URL.Query().Get("course")
	if course == "" {
		http.Error(w, "course is required", http.StatusBadRequest)
		return
	}

	query := query.QP_SEARCH

	// var params []interface{}
	// params = append(params, course)
	params := pgx.NamedArgs{
		"query_text": course,
	}
	exam := r.URL.Query().Get("exam")
	if exam != "" {
		query = fmt.Sprintf(`%s WHERE (exam = @exam OR exam = '')`, query)
		params = pgx.NamedArgs{
			"query_text": course,
			"exam":       exam,
		}
	}

	rows, err := db.Query(context.Background(), query, params)
	config.Get().Logger.Debug("rows were fetched")
	if err != nil {
		sendErrorResponse(w, http.StatusInternalServerError, err.Error(), nil)
		return
	}
	defer rows.Close()
	var qps []QuestionPaper = make([]QuestionPaper, 0)
	for rows.Next() {
		qp := QuestionPaper{}
		err := rows.Scan(&qp.ID, &qp.CourseCode, &qp.CourseName, &qp.Year, &qp.Exam, &qp.FileLink, &qp.FromLibrary, &qp.UploadTimestamp, &qp.ApproveStatus)
		if err != nil {
			config.Get().Logger.Error("HandleQPSearch: Error parsing question paper details")
			sendErrorResponse(w, http.StatusInternalServerError, err.Error(), nil)
			return
		}
		if qp.Exam == "" {
			qp.Exam = "unknown"
		}
		qp.FileLink = fmt.Sprintf("%s/%s", config.Get().StaticFilesUrl, qp.FileLink)
		qps = append(qps, qp)
	}

	config.Get().Logger.Info("HandleQPSearch: Question paper search query %s returned %d results", course, len(qps))
	sendResponse(w, http.StatusOK, qps)
}

func ListUnapprovedPapers(w http.ResponseWriter, r *http.Request) {
	db := db.GetDB()
	rows, err := db.Query(context.Background(), "SELECT course_code, course_name, year, exam,filelink,id, from_library FROM iqps WHERE approve_status = false ORDER BY upload_timestamp ASC")
	if err != nil {
		sendErrorResponse(w, http.StatusInternalServerError, err.Error(), nil)
		return
	}
	defer rows.Close()

	var qps []QuestionPaper = make([]QuestionPaper, 0)
	for rows.Next() {
		qp := QuestionPaper{}
		err := rows.Scan(&qp.CourseCode, &qp.CourseName, &qp.Year, &qp.Exam, &qp.FileLink, &qp.ID, &qp.FromLibrary)
		if err != nil {
			sendErrorResponse(w, http.StatusInternalServerError, err.Error(), nil)
			return
		}
		qp.FileLink = fmt.Sprintf("%s/%s", config.Get().StaticFilesUrl, qp.FileLink)
		qps = append(qps, qp)
	}
	config.Get().Logger.Info("listUnapprovedPapers: Unapproved Question paper count", slog.Int("QP count", len(qps)))
	sendResponse(w, http.StatusOK, qps)
}

func HandleFileUpload(w http.ResponseWriter, r *http.Request) {
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
		sendErrorResponse(w, http.StatusInternalServerError, "Incorrect File Size", nil)
		config.Get().Logger.Error("HandleFileUpload: Request Body Size Exceeded")
		return
	}

	maxLimit := config.Get().MaxUploadLimit

	files := r.MultipartForm.File["files"]
	log.Printf("/upload: Received %d files.", len(files))
	if len(files) > maxLimit {
		config.Get().Logger.Error("HandleFileUpload: Allowed %s file uploads, found %d", slog.Int("max Limit", maxLimit), slog.Int("Upload Length", len(files)))
		sendErrorResponse(w, http.StatusBadRequest, fmt.Sprintf("maximum %d files allowed", maxLimit), nil)
		return
	}

	for _, fileHeader := range files {
		resp := uploadEndpointRes{Filename: fileHeader.Filename, Status: "success"}

		if fileHeader.Size > 10<<20 {
			config.Get().Logger.Error("HandleFileUpload: File of size %s uploaded", slog.Int64("filesize", fileHeader.Size))
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
			config.Get().Logger.Error("HandleFileUpload:", slog.String("Invalid file type", fileType))
			resp.Status = "failed"
			resp.Description = "invalid file type. Only PDFs are supported"
			response = append(response, resp)
			continue
		}

		fileName := fileHeader.Filename

		FileNameList := r.MultipartForm.Value[fileName]
		if len(FileNameList) == 0 {
			config.Get().Logger.Error("HandleFileUpload: filename not provided")
			resp.Status = "failed"
			resp.Description = "filename not provided"
			response = append(response, resp)
			continue
		}

		newFileName := FileNameList[0]
		filePath := filepath.Join(config.Get().StaticFilesStorageLocation, config.Get().UploadedQPsPath, newFileName)
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

	config.Get().Logger.Info("HandleFileUpload: files successfully uploaded")
	// return response to client
	sendResponse(w, http.StatusAccepted, response)
}

func populateDB(filename string) error {
	db := db.GetDB()
	qpData := strings.Split(filename, "_")
	if len(qpData) != 5 {
		return fmt.Errorf("invalid filename format")
	}

	courseCode := qpData[0]
	courseName := qpData[1]

	year, _ := strconv.Atoi(qpData[2])
	exam := qpData[3]
	fromLibrary := false
	fileLink := filepath.Join(config.Get().UploadedQPsPath, filename+".pdf")
	query := "INSERT INTO iqps (course_code, course_name, year, exam, filelink, from_library) VALUES ($1, $2, $3, $4, $5, $6);"

	_, err := db.Exec(context.Background(), query, courseCode, courseName, year, exam, fileLink, fromLibrary)
	if err != nil {
		return fmt.Errorf("failed to add qp to database: %v", err.Error())
	}
	return nil
}

func GhAuth(w http.ResponseWriter, r *http.Request) {
	ghOAuthReqBody := GhOAuthReqBody{}
	if err := json.NewDecoder(r.Body).Decode(&ghOAuthReqBody); err != nil {
		sendErrorResponse(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	if ghOAuthReqBody.GhCode == "" {
		sendErrorResponse(w, http.StatusBadRequest, "Github OAuth Code cannot be empty", nil)
		return
	}

	// Get the access token for authenticating other endpoints
	uri := fmt.Sprintf("https://github.com/login/oauth/access_token?client_id=%s&client_secret=%s&code=%s", config.Get().GithubSecrets.PublicKey, config.Get().GithubSecrets.PrivateKey, ghOAuthReqBody.GhCode)

	req, _ := http.NewRequest("POST", uri, nil)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error Getting Github Access Token: ", err.Error())
		sendErrorResponse(w, http.StatusInternalServerError, "Could not connect to Github", nil)
		return
	}
	defer resp.Body.Close()

	// Decode the response
	var tokenResponse GithubAccessTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		fmt.Println("Error Decoding Github Access Token: ", err.Error())
		sendErrorResponse(w, http.StatusInternalServerError, "Could not decode github token", nil)
		return
	}

	// Get the username of the user who made the request
	req, _ = http.NewRequest("GET", "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+tokenResponse.AccessToken)

	resp, err = client.Do(req)
	if err != nil {
		fmt.Println("Error getting username: ", err.Error())
		sendErrorResponse(w, http.StatusInternalServerError, "Could not decode github token", nil)
		return
	}
	defer resp.Body.Close()

	// Decode the response
	var userResponse GithubUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&userResponse); err != nil {
		fmt.Println("Error decoding username: ", err.Error())
		sendErrorResponse(w, http.StatusInternalServerError, "Could not decode github token", nil)
		return
	}

	uname := userResponse.Login
	// check if uname is empty
	if uname == "" {
		sendErrorResponse(w, http.StatusUnauthorized, "username does not exist", nil)
		return
	}

	// Send request to check status of the user in the given org's team
	url := fmt.Sprintf("https://api.github.com/orgs/%s/teams/%s/memberships/%s", config.Get().GithubSecrets.OrgName, config.Get().GithubSecrets.OrgTeam, uname)
	req, _ = http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+config.Get().GithubSecrets.OrgAdminToken)
	resp, err = client.Do(req)

	var checkResp struct {
		State string `json:"state"`
	}

	if err != nil {
		fmt.Println("Error validating user membership: ", err.Error())
		sendErrorResponse(w, http.StatusInternalServerError, "could not validate user membership", nil)
		return
	}

	defer resp.Body.Close()
	// decode the response
	if err := json.NewDecoder(resp.Body).Decode(&checkResp); err != nil {
		fmt.Println("Error decoding gh validation body: ", err.Error())
		sendErrorResponse(w, http.StatusInternalServerError, "could not decode github response", nil)
		return
	}

	// Check if user is present in the team
	if checkResp.State != "active" {
		sendErrorResponse(w, http.StatusUnauthorized, "user not allowed admin access", nil)
		return
	}

	// create JWT token
	expirationTime := time.Now().Add(5 * time.Hour)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		Username: uname,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	})

	tokenString, err := token.SignedString([]byte(config.Get().JWTSecret))
	if err != nil {
		fmt.Println("Error Sigining JWT: ", err.Error())
		sendErrorResponse(w, http.StatusInternalServerError, "Error signing JWT token, try again later", nil)
		return
	}
	respData.Token = tokenString

	// Send the response
	sendResponse(w, http.StatusAccepted, respData)
}

func JWTMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// get the authorisation header
		tokenString := r.Header.Get(AUTHORIZATION_HEADER)
		if tokenString == "" {
			sendErrorResponse(w, http.StatusUnauthorized, "Missing authorization header", nil)
			return
		}
		JWTtoken := strings.Split(tokenString, " ")

		if len(JWTtoken) != 2 && JWTtoken[0] != "Bearer" {
			sendErrorResponse(w, http.StatusBadRequest, "Authorization header is incorrect", nil)
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(JWTtoken[1], claims, func(t *jwt.Token) (interface{}, error) {
			if _, OK := t.Method.(*jwt.SigningMethodHMAC); !OK {
				return nil, errors.New("bad signed method received")
			}

			return []byte(config.Get().JWTSecret), nil
		})
		// Check if error in parsing jwt token
		if err != nil {
			sendErrorResponse(w, http.StatusUnauthorized, err.Error(), nil)
			return
		}
		// Get the claims

		if token.Valid && claims.Username != "" {
			// If valid claims found, send response
			ctx := context.WithValue(r.Context(), CLAIMS_KEY, claims)
			handler.ServeHTTP(w, r.WithContext(ctx))
		} else {
			sendErrorResponse(w, http.StatusUnauthorized, "Invalid JWT Token", nil)
			return
		}
	})
}

func sendResponse(w http.ResponseWriter, code int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)

	out, err := json.Marshal(httpResp{Status: "success", Data: data})
	if err != nil {
		sendErrorResponse(w, http.StatusInternalServerError, "Internal Server Error", nil)
		return
	}

	w.Write(out)
}

func sendErrorResponse(w http.ResponseWriter, statusCode int, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)

	resp := httpResp{
		Status:  "error",
		Message: message,
		Data:    data,
	}
	out, _ := json.Marshal(resp)
	w.Write(out)
}
