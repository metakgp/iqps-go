package main

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/joho/godotenv"
	"github.com/metakgp/iqps/backend/pkg/config"
	"github.com/rs/cors"

	_ "github.com/lib/pq"
)

func main() {
	godotenv.Load()

	http.HandleFunc("/health", HandleHealthCheck)
	http.HandleFunc("/search", HandleQPSearch)
	http.HandleFunc("/year", HandleQPYear)
	http.HandleFunc("/library", HandleLibraryPapers)
	http.HandleFunc("POST /upload", HandleFileUpload)
	http.HandleFunc("POST /oauth", GhAuth)
	http.Handle("GET /unapproved", JWTMiddleware(http.HandlerFunc(ListUnapprovedPapers)))

	logger := config.Get().Logger
	c := cors.New(cors.Options{
		AllowCredentials: true,
		AllowedHeaders:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},
		AllowedOrigins:   []string{"https://qp.metakgp.org", "http://localhost:3000"},
	})

	logger.Info("Main: Starting server on port 5000")
	err := http.ListenAndServe(":5000", c.Handler(http.DefaultServeMux))
	if errors.Is(err, http.ErrServerClosed) {
		logger.Error("server closed\n")
	} else if err != nil {
		logger.Error("Main:", slog.String("Error starting server", err.Error()))
		panic(err)
	}
}
