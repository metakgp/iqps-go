package main

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
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

	gzipWriter := gzip.NewWriter(tarFile)
	defer gzipWriter.Close()
	tarWriter := tar.NewWriter(gzipWriter)
	defer tarWriter.Close()

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
	} else {

		fmt.Println("Tarball created successfully")
	}
}

func sanitizeFilename(s string) string {
	// replaces all spaces with _
	return strings.ReplaceAll(s, "%20", "_")
}

func main() {
	YEAR := 2024

	start := time.Now()

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
			temp := strings.Split(file_url, "/")
			name = temp[len(temp)-1]
			year, _ = strconv.Atoi(temp[4])
			details := strings.ToLower(temp[5])
			if strings.Contains(details, "mid") {
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

			// filenames in library are of the form course-code_course-name_extra-details,
			// extracting course_code from the filename since course_code is a mandatory field
			pattern := `\b\w{2}\d{5}\b`
			re := regexp.MustCompile(pattern)
			course_code := ""
			name_split := strings.Split(name[:len(name)-4], "_")

			if len(name_split[0]) == 7 && re.MatchString(name_split[0]) {
				// what to do if there are multiple course codes in the filename?
				course_code = name_split[0]
				name_split = name_split[1:]
			}
			// strip off extra details from the end of the filename
			if len(name_split) > 0 && name_split[len(name_split)-1] == "2024" {
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
			if course_code == "" || name == "" {
				is_approved = false
				if course_code == "" {
					course_code = "UNKNOWN"
				}
				if name == "" {
					name = "UNKNOWN"
				}
			}

			new_qp = append(new_qp, QuestionPaper{course_code, sanitizeFilename(strings.Join(temp[4:], "_")), name, year, exam_type, sem, file_url, is_approved})
		} else {
			c.Visit(e.Request.AbsoluteURL(link))
		}
	})

	c.Visit(fmt.Sprintf("http://10.18.24.75/peqp/%d", YEAR))
	c.Wait()

	t1 := time.Now()

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

	t2 := time.Now()

	// for i := range new_qp {
	// 	fmt.Printf("%d/%d: Downloading %s\n", i+1, len(new_qp), new_qp[i].Name)
	// 	downloadFile(new_qp[i])
	// }

	const goroutines = 10
	jobs := make(chan QuestionPaper, len(new_qp))
	var wg sync.WaitGroup

	for w := 1; w <= goroutines; w++ {
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

	t3 := time.Now()

	createTarball()

	t4 := time.Now()

	fmt.Println("Time taken:")
	fmt.Println("Load courses.json, scraping library site:", t1.Sub(start))
	fmt.Println("Create JSON file, clear qps folder:", t2.Sub(t1))
	fmt.Println("Download all question papers:", t3.Sub(t2))
	fmt.Println("Create tarball:", t4.Sub(t3))
	fmt.Println("---------------------------------")
	fmt.Println("Total time taken:", t4.Sub(start))

}
