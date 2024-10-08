package main

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/metakgp/iqps/backend/pkg/config"
	"github.com/rs/cors"

	_ "github.com/lib/pq"
)

func main() {
	godotenv.Load()

	http.HandleFunc("/health", HandleHealthCheck)
	http.HandleFunc("/search", HandleQPSearch)
	http.HandleFunc("/library", HandleLibraryPapers)
	http.HandleFunc("POST /upload", HandleFileUpload)
	http.HandleFunc("POST /oauth", GhAuth)
	http.Handle("GET /unapproved", JWTMiddleware(http.HandlerFunc(ListUnapprovedPapers)))
	http.Handle("GET /all", JWTMiddleware(http.HandlerFunc(ListAllPapers)))
	http.Handle("POST /approve", JWTMiddleware(http.HandlerFunc(HandleApprovePaper)))
	http.Handle("POST /delete", JWTMiddleware(http.HandlerFunc(HandleDeletePaper)))
	http.Handle("GET /profile", JWTMiddleware(http.HandlerFunc(HandleProfile)))
	http.Handle("GET /similar", JWTMiddleware(http.HandlerFunc(HandleFetchSimilarPapers)))

	logger := config.Get().Logger
	c := cors.New(cors.Options{
		AllowCredentials: true,
		AllowedHeaders:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},
		AllowedOrigins:   []string{"https://qp.metakgp.org", "http://localhost:3000", "http://localhost:5173"},
	})

	logLocation := os.Getenv("IQPS_LOG_LOCATION")
	if logLocation == "" {
		logLocation = "/var/log/iqps/logs/application.log"
	}
	fmt.Print("Logs are in ", logLocation, "\n")
	logger.Info("Main: Starting server on port 5000")
	err := http.ListenAndServe(":5000", c.Handler(http.DefaultServeMux))
	if errors.Is(err, http.ErrServerClosed) {
		logger.Error("server closed\n")
	} else if err != nil {
		logger.Error("Main:", slog.String("Error starting server", err.Error()))
		panic(err)
	}
}
