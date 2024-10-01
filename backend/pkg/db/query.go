package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
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

func (db *db) InsertNewPaper(qpDetails *models.QuestionPaper) (int, error) {
	query := "INSERT INTO iqps (course_code, course_name, year, exam, filelink, semester, approve_status, from_library, approved_by) VALUES (@course_code, @course_name, @year, @exam, @filelink, @semester, @approve_status, @from_library, @approved_by) RETURNING id"
	params := pgx.NamedArgs{
		"course_code":    qpDetails.CourseCode,
		"course_name":    qpDetails.CourseName,
		"year":           qpDetails.Year,
		"exam":           qpDetails.Exam,
		"semester":       qpDetails.Semester,
		"filelink":       qpDetails.FileLink,
		"from_library":   qpDetails.FromLibrary,
		"approve_status": qpDetails.ApproveStatus,
		"approved_by":    qpDetails.ApprovedBy,
	}
	var id int
	err := db.Db.QueryRow(context.Background(), query, params).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (db *db) MarkPaperAsSoftDeletedAndUnApprove(qpID int, approvedBy string) error {
	query := "UPDATE iqps set approve_status=false, is_deleted = true, approved_by=@approved_by where id=@qpID and is_deleted=false"
	params := pgx.NamedArgs{
		"qpID":        qpID,
		"approved_by": approvedBy,
	}

	ct, err := db.Db.Exec(context.Background(), query, params)
	if err != nil {
		return err
	}

	if ct.RowsAffected() == 0 {
		return fmt.Errorf("no such paper found to be approved")
	}
	return nil
}
