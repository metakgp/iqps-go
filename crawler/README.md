# Steps to run crawler and import data into db

1. Download modules: `go mod tidy`
2. Run crawler: `go run crawler.go`. (Be connected to campus network)
3. Transfer files `qp.json` and `qp.tar.gz` to server's `backend` folder.
4. In the backend, run `cargo run --bin fetch-library` to import the data into the database.
