package main

import (
	"encoding/json"
	"fmt"
	"net/http"
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
	name      string
	year      int
	exam_type string
}

func main() {

	sql_query := "INSERT INTO qp (name, year, exam) VALUES\n"

	c := colly.NewCollector(
		colly.AllowedDomains("10.18.24.75"),
		colly.CacheDir("./cache"),
		colly.MaxDepth(9),
		colly.Async(true),
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
		link := e.Attr("href")
		url := e.Request.AbsoluteURL(link)
		var name string
		var year int
		var exam_type string

		if strings.Contains(url, ".pdf") {
			temp := strings.Split(url, "/")
			if len(temp) == 8 {
				name = temp[7]
				year, _ = strconv.Atoi(temp[4])
				exam_type = strings.ToLower(temp[5])
				i := strings.Index(exam_type, "mid")
				if i != -1 {
					exam_type = exam_type[i : i+3]
				} else {
					i = strings.Index(exam_type, "end")
					if i != -1 {
						exam_type = exam_type[i : i+3]
					} else {
						exam_type = ""
					}
				}
			} else {
				name = temp[6]
				year, _ = strconv.Atoi(temp[4])
				exam_type = ""
			}

			for i := range existing_qp {
				if existing_qp[i].CourseName == name && existing_qp[i].Year == year && existing_qp[i].Exam == exam_type {
					return
				}
			}

			fmt.Println(name, year, exam_type)
			new_qp = append(new_qp, qpRaw{name, year, exam_type})
			sql_query = sql_query + "(" + name + ", " + fmt.Sprint(year) + ", " + exam_type + "),\n"
		}

		c.Visit(e.Request.AbsoluteURL(link))
	})

	c.Visit("http://10.18.24.75/peqp")
	c.Wait()

	fmt.Println(sql_query)
}
