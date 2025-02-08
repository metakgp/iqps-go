# Steps to run crawler and import data into db

1. Download modules: `go mod tidy`
2. Run crawler: `go run crawler.go`. (Be connected to campus network)
3. Compress the `crawler/qp` directory and transfer to server.
4. Transfer `crawler/qp.csv` to the server
5. Import the csv into the db. Open a psql shell and run the following command:
   ```sql
   COPY iqps(course_code,course_name,year,exam,semester,filelink,from_library,approve_status)
   FROM '/path/to/qp.csv'
   DELIMITER ','
   CSV HEADER;
   ```
