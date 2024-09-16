package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/metakgp/iqps/backend/pkg/config"
	"github.com/metakgp/iqps/backend/pkg/models"
)

func (db *db) FetchAllQuestionPapers() ([]models.QuestionPaper, error) {
	rows, err := db.Db.Query(context.Background(), "SELECT course_code,course_name,year,exam,filelink,id,from_library FROM iqps ORDER BY upload_timestamp ASC")
	if err != nil {
		config.Get().Logger.Errorf("FetchAllQuestionpapers: Could not fetch all question papers, error: %+v", err.Error())
		return nil, errors.New("unable to fetch question paper, try again later")
	}
	defer rows.Close()

	var qps []models.QuestionPaper = make([]models.QuestionPaper, 0)
	for rows.Next() {
		qp := models.QuestionPaper{}
		err := rows.Scan(&qp.CourseCode, &qp.CourseName, &qp.Year, &qp.Exam, &qp.FileLink, &qp.ID, &qp.FromLibrary)
		if err != nil {
			config.Get().Logger.Errorf("FetchAllQuestionpapers: Error Scanning Paper in Struct, error: %+v", err.Error())
			return nil, errors.New("unable to fetch question paper, try again later")
		}
		qp.FileLink = fmt.Sprintf("%s/%s", config.Get().StaticFilesUrl, qp.FileLink)
		qps = append(qps, qp)
	}

	return qps, nil
}
