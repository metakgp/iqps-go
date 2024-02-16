# Steps to run crawler and import data into db

1. Download modules: `go mod tidy`
2. Run crawler: `go run crawler.go`. (Be connected to campus network)
3. Compress the `crawler/qp` directory and transfer to server.
4. Transfer `crawler/qp.csv` to the server
5. Import the csv into the sqlite3 db. A little janky way here. Open sqlite3 console
   - First import the csv into a temporary table: `.import <path-to-qp.csv> temptable --csv`
   - Copy the data to `qp` table: `INSERT INTO qp(course_name, year, exam, filelink, from_library) SELECT * FROM temptable;`
   - Delete temporary table: `DROP TABLE temptable;`
