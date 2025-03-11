package main

import (
	"archive/tar"
	"bufio"
	"compress/gzip"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gocolly/colly"
)

type QuestionPaper struct {
	CourseCode    string `json:"course_code"`
	Filename      string `json:"filename"`
	Name          string `json:"course_name"`
	Year          int    `json:"year"`
	ExamType      string `json:"exam"`
	Semester      string `json:"semester"`
	Url           string `json:"url"`
	ApproveStatus bool   `json:"approve_status"`
}

func downloadFile(new_qp QuestionPaper) {
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

func createTarball() {
	srcDir := "./qp"
	tarPath := "./qp.tar.gz"

	tarFile, err := os.Create(tarPath)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer tarFile.Close()

	bufWriter := bufio.NewWriter(tarFile)
	defer bufWriter.Flush()
	gzipWriter := gzip.NewWriter(bufWriter)
	defer gzipWriter.Close()
	tarWriter := tar.NewWriter(gzipWriter)
	defer tarWriter.Close()

	// add qp.json
	jsonFile := "./qp.json"
	info, err := os.Stat(jsonFile)
	if err != nil {
		fmt.Println(err)
		return
	}
	header, err := tar.FileInfoHeader(info, info.Name())
	if err != nil {
		fmt.Println(err)
		return
	}
	header.Name = info.Name()
	if err := tarWriter.WriteHeader(header); err != nil {
		fmt.Println(err)
		return
	}
	file, err := os.Open(jsonFile)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer file.Close()
	if _, err := io.Copy(tarWriter, file); err != nil {
		fmt.Println(err)
		return
	}

	// add pdf files
	err = filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			fmt.Println(err)
			return err
		}

		parts := strings.Split(info.Name(), ".")
		if len(parts) > 1 && parts[len(parts)-1] == "pdf" {
			header, err := tar.FileInfoHeader(info, info.Name())
			if err != nil {
				fmt.Println(err)
				return err
			}

			header.Name = strings.TrimPrefix(path, srcDir)
			if err := tarWriter.WriteHeader(header); err != nil {
				fmt.Println(err)
				return err
			}

			file, err := os.Open(path)
			if err != nil {
				fmt.Println(err)
				return err
			}
			defer file.Close()

			if _, err := io.Copy(tarWriter, file); err != nil {
				fmt.Println(err)
				return err
			}
		}

		return nil
	})
	if err != nil {
		fmt.Println(err)
		return
	}

	fmt.Println("Tarball created successfully")
}

func sanitizeFilename(s string) string {
	// replaces all spaces with _
	return strings.ReplaceAll(s, "%20", "_")
}

const URL = "http://10.18.24.75/peqp"

func main() {
	YEAR := flag.Int("year", time.Now().Year(), "Year of the question papers")
	SEM := flag.String("sem", "both", "Semester of the question papers") // autumn, spring, both
	ROUTINES := flag.Int("routines", 50, "Number of goroutines to use for downloading")
	flag.Parse()

	if *SEM != "autumn" && *SEM != "spring" && *SEM != "both" {
		fmt.Println("Invalid semester, please enter `autumn`, `spring` or `both`")
		return
	}

	c := colly.NewCollector(
		colly.AllowedDomains("10.18.24.75"),
		colly.MaxDepth(9),
	)

	coursesFile, err := os.Open("../frontend/src/data/courses.json")
	if err != nil {
		fmt.Println("Error opening file:", err)
		return
	}

	byteValue, err := io.ReadAll(coursesFile)
	if err != nil {
		fmt.Println("Error reading file:", err)
		return
	}

	var courses map[string]interface{}
	err = json.Unmarshal(byteValue, &courses)
	if err != nil {
		fmt.Println("Error decoding JSON:", err)
		return
	}

	var new_qp []QuestionPaper
	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		if e.Text == "Parent Directory" || e.Text == "Name" || e.Text == "Last modified" || e.Text == "Size" || e.Text == "Description" {
			return
		}
		link := e.Attr("href")
		file_url := e.Request.AbsoluteURL(link)
		var name string
		var year int
		var exam_type string
		var sem string

		if strings.Contains(file_url, ".pdf") {
			// url: /peqp/2024/End-Spring/[Department]/[CourseCode]_[CourseName]_ES_2024.pdf (as of 2024)
			temp := strings.Split(file_url, "/")
			name = temp[len(temp)-1]
			year, _ = strconv.Atoi(temp[4])
			details := strings.ToLower(temp[5])
			if strings.Contains(details, "mid") { // TODO fix 'if-else hell'
				exam_type = "midsem"
			} else if strings.Contains(details, "end") {
				exam_type = "endsem"
			} else {
				exam_type = ""
			}
			if strings.Contains(details, "aut") {
				sem = "autumn"
			} else if strings.Contains(details, "spr") {
				sem = "spring"
			} else {
				sem = ""
			}

			if sem != *SEM && *SEM != "both" {
				return
			}

			// filenames in library are of the form course-code_course-name_extra-details,
			// extracting course_code from the filename since course_code is a mandatory field
			courseCodeRe := regexp.MustCompile(`\b\w{2}\d{5}\b`)
			course_code := ""
			name_split := strings.Split(name[:len(name)-4], "_")

			if len(name_split[0]) == 7 && courseCodeRe.MatchString(name_split[0]) {
				// what to do if there are multiple course codes in the filename?
				course_code = name_split[0]
				name_split = name_split[1:]
			}
			// strip off extra details from the end of the filename (_ES_2024)
			if len(name_split) > 0 && name_split[len(name_split)-1] == strconv.Itoa(year) {
				name_split = name_split[:len(name_split)-1]
			}
			types := []string{"EA", "MA", "ES", "MS"}
			for _, code := range types {
				if len(name_split) > 0 && code == name_split[len(name_split)-1] {
					name_split = name_split[:len(name_split)-1]
					break
				}
			}
			name = strings.Join(name_split, " ")
			if len(name) < 5 { // assuming course name is at least 5 characters long
				name = ""
			}

			if courses[course_code] != nil {
				name = courses[course_code].(string)
			}
			is_approved := true
			// add the paper as unapproved if course_code or name is missing
			if course_code == "" || name == "" || exam_type == "" || sem == "" {
				is_approved = false

				if name == "" {
					name = "UNKNOWN"
				}
			}

			new_qp = append(new_qp, QuestionPaper{course_code, sanitizeFilename(strings.Join(temp[4:], "_")), name, year, exam_type, sem, file_url, is_approved})
		} else {
			// visit non-pdf links
			c.Visit(e.Request.AbsoluteURL(link))
		}
	})

	fmt.Printf("Fetching question papers for %d (%s sem)\n", *YEAR, *SEM)

	c.Visit(fmt.Sprintf("%s/%d", URL, *YEAR))
	c.Wait()

	if len(new_qp) == 0 {
		fmt.Println("No question papers found (use -year flag to specify year)")
		return
	}

	file, err := os.Create("qp.json")
	if err != nil {
		fmt.Println("Error creating JSON file:", err)
		return
	}
	defer file.Close()

	jsonBytes, err := json.Marshal(new_qp)
	if err != nil {
		fmt.Println("Error encoding JSON:", err)
		return
	}
	_, err = file.Write(jsonBytes)
	if err != nil {
		fmt.Println("Error writing to file:", err)
		return
	}
	fmt.Println("JSON file created successfully")

	// delete all pdf files in the qp directory
	files, err := os.ReadDir("./qp")
	if err != nil {
		fmt.Println("Error reading directory:", err)
		return
	}
	for _, file := range files {
		if strings.Contains(file.Name(), ".pdf") {
			err = os.Remove("./qp/" + file.Name())
			if err != nil {
				fmt.Println("Error deleting file:", err)
				return
			}
		}
	}

	jobs := make(chan QuestionPaper, len(new_qp))
	var wg sync.WaitGroup

	for w := 1; w <= *ROUTINES; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobs {
				downloadFile(job)
			}
		}()
	}

	for _, qp := range new_qp {
		jobs <- qp
	}
	close(jobs)
	wg.Wait()

	createTarball()
}
