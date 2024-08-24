package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gocolly/colly"
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

type qpRaw struct {
	Filename string `json:"filename"`
	Name     string `json:"name"`
	Year     int    `json:"year"`
	ExamType string `json:"exam_type"`
	Url      string `json:"url"`
}

func downloadFile(new_qp qpRaw) {

	res, err := http.Get(new_qp.Url)
	if err != nil {
		fmt.Println(err)
		return
	}

	if res.StatusCode != 200 {
		fmt.Printf("Failed to download file: %s. Status Code: %d", new_qp.Name, res.StatusCode)
		return
	}

	defer res.Body.Close()

	file, err := os.Create("./qp/" + new_qp.Filename)
	if err != nil {
		fmt.Println(err)
	}

	_, err = io.Copy(file, res.Body)
	if err != nil {
		fmt.Println(err)
	}
	defer file.Close()
}

func sanitizeFilename(s string) string {
	// replaces all spaces with _
	return strings.ReplaceAll(s, "%20", "_")
}

func main() {

	c := colly.NewCollector(
		colly.AllowedDomains("10.18.24.75"),
		colly.MaxDepth(9),
	)

	res, err := http.Get("http://localhost:5000/library")
	if err != nil {
		fmt.Println(err)
	}
	defer res.Body.Close()

	var existing_qp []QuestionPaper
	json.NewDecoder(res.Body).Decode(&existing_qp)

	var new_qp []qpRaw

	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		if e.Text == "Parent Directory" || e.Text == "Name" || e.Text == "Last modified" || e.Text == "Size" || e.Text == "Description" {
			return
		}
		link := e.Attr("href")
		file_url := e.Request.AbsoluteURL(link)
		var name string
		var year int
		var exam_type string

		if strings.Contains(file_url, ".pdf") {
			temp := strings.Split(file_url, "/")
			name = temp[len(temp)-1]
			year, _ = strconv.Atoi(temp[4])
			exam_type = strings.ToLower(temp[5])
			if strings.Contains(exam_type, "mid") {
				exam_type = "mid"
			} else if strings.Contains(exam_type, "end") {
				exam_type = "end"
			} else {
				exam_type = ""
			}

			for i := range existing_qp {
				if existing_qp[i].CourseName == name && existing_qp[i].Year == year && existing_qp[i].Exam == exam_type {
					return
				}
			}

			new_qp = append(new_qp, qpRaw{sanitizeFilename(strings.Join(temp[4:], "_")), name, year, exam_type, file_url})
		}

		c.Visit(e.Request.AbsoluteURL(link))
	})

	c.Visit("http://10.18.24.75/peqp/2024")
	c.Wait()

	file, err := os.Create("qp.csv")
	if err != nil {
		fmt.Println("Error creating CSV file:", err)
		return
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	header := []string{"course_name", "year", "exam", "filelink", "from_library"}
	if err := writer.Write(header); err != nil {
		fmt.Println("Error writing header to CSV:", err)
		return
	}

	for i := range new_qp {
		var exam_type string
		if new_qp[i].ExamType != "" {
			exam_type = new_qp[i].ExamType + "sem"
		}
		var row = []string{
			strings.Trim(new_qp[i].Name, ".pdf"),
			fmt.Sprint(new_qp[i].Year),
			exam_type,
			new_qp[i].Filename,
			"true"}
		if err := writer.Write(row); err != nil {
			fmt.Println("Error writing row to CSV:", err)
			return
		}
	}
	fmt.Println("CSV file created successfully")

	for i := range new_qp {
		fmt.Printf("%d/%d: Downloading %s\n", i+1, len(new_qp), new_qp[i].Name)
		downloadFile(new_qp[i])
	}
}
