use color_eyre::eyre::eyre;
use models::DBAdminDashboardQP;
use sqlx::{postgres::PgPoolOptions, prelude::FromRow, PgPool, Postgres, Transaction};
use std::time::Duration;

use crate::{
    env::EnvVars,
    pathutils::PaperCategory,
    qp::{self, AdminDashboardQP, Exam, Semester},
    routing::{EditReq, FileDetails},
};

mod models;
mod queries;

#[derive(Clone)]
pub struct Database {
    connection: PgPool,
}

#[derive(FromRow)]
struct Breh {
    id: i32,
}

impl Database {
    pub async fn new(env_vars: &EnvVars) -> Result<Self, sqlx::Error> {
        let database_url = format!(
            "postgres://{}:{}@{}:{}/{}",
            env_vars.db_user,
            env_vars.db_password,
            env_vars.db_host,
            env_vars.db_port,
            env_vars.db_name
        );

        let conn_pool = PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(Duration::from_secs(3))
            .connect(&database_url)
            .await?;

        Ok(Self {
            connection: conn_pool,
        })
    }

    /// Fetches the list of all unapproved papers
    pub async fn get_unapproved_papers(&self) -> Result<Vec<qp::AdminDashboardQP>, sqlx::Error> {
        let query_sql = queries::get_all_unapproved_query();
        let papers: Vec<models::DBAdminDashboardQP> = sqlx::query_as(&query_sql)
            .fetch_all(&self.connection)
            .await?;

        Ok(papers
            .iter()
            .map(|qp| qp::AdminDashboardQP::from(qp.clone()))
            .collect())
    }

    /// Searches for papers from a given query. Uses some voodoo black magic by @rajivharlalka
    pub async fn search_papers(
        &self,
        query: &String,
        exam: Option<Exam>,
    ) -> Result<Vec<qp::SearchQP>, sqlx::Error> {
        let exam_param = exam.map(String::from).unwrap_or("".into());
        let use_exam = !exam_param.is_empty();

        let query_sql = queries::get_qp_search_query(use_exam);
        let query = sqlx::query_as(&query_sql).bind(query);

        let query = if use_exam {
            query.bind(exam_param)
        } else {
            query
        };

        let papers: Vec<models::DBSearchQP> = query.fetch_all(&self.connection).await?;

        Ok(papers
            .iter()
            .map(|qp| qp::SearchQP::from(qp.clone()))
            .collect())
    }

    pub async fn get_paper_by_id(&self, id: i32) -> Result<qp::AdminDashboardQP, sqlx::Error> {
        let query_sql = queries::get_get_paper_by_id_query();
        let query = sqlx::query_as(&query_sql).bind(id);

        let paper: models::DBAdminDashboardQP = query.fetch_one(&self.connection).await?;

        Ok(paper.into())
    }

    /// Edit's a paper's details.
    ///
    /// - Sets the `approved_by` field to the username if approved.
    /// - Sets the `filelink` to:
    ///     - For library papers, remains unchanged
    ///     - For uploaded papers, approved papers are moved to the approved directory and renamed `id_coursecode_coursename_year_semester_exam.pdf` and unapproved papers are moved to the unapproved directory and named `id.pdf`
    ///
    /// Returns the database transaction, the old filelink and the new paper details ([`crate::qp::AdminDashboardQP`])
    pub async fn edit_paper<'c>(
        &self,
        edit_req: EditReq,
        username: &str,
        env_vars: &EnvVars,
    ) -> Result<(Transaction<'c, Postgres>, String, AdminDashboardQP), color_eyre::eyre::Error>
    {
        let EditReq {
            id,
            course_code,
            course_name,
            year,
            semester,
            exam,
            approve_status,
        } = edit_req;

        let current_details = self.get_paper_by_id(id).await?;

        // Construct the final values to be inserted into the db
        let course_code = course_code.unwrap_or(current_details.course_code);
        let course_name = course_name.unwrap_or(current_details.course_name);
        let year = year.unwrap_or(current_details.year);
        let semester: String = if let Some(semester) = semester {
            Semester::try_from(&semester)?
        } else {
            current_details.semester
        }
        .into();
        let exam: String = if let Some(exam) = exam {
            Exam::try_from(&exam)?
        } else {
            current_details.exam
        }
        .into();
        let approve_status = approve_status.unwrap_or(current_details.approve_status);

        // Set the new filelink
        let old_filelink = current_details.filelink;
        let new_filelink = if current_details.from_library {
            old_filelink.clone()
        } else if approve_status {
            env_vars.paths.get_slug(
                &format!(
                    "{}_{}_{}_{}_{}_{}.pdf",
                    id, course_code, course_name, year, semester, exam
                ),
                PaperCategory::Approved,
            )
        } else {
            env_vars
                .paths
                .get_slug(&format!("{}.pdf", id), PaperCategory::Unapproved)
        };

        let mut tx = self.connection.begin().await?;

        let query_sql = queries::get_edit_paper_query(approve_status);
        let query = sqlx::query_as(&query_sql)
            .bind(id)
            .bind(&course_code)
            .bind(&course_name)
            .bind(year)
            .bind(&semester)
            .bind(&exam)
            .bind(approve_status)
            .bind(&new_filelink);

        let query = if approve_status {
            query.bind(username)
        } else {
            query
        };

        let new_qp: DBAdminDashboardQP = query.fetch_one(&mut *tx).await?;
        let new_qp = AdminDashboardQP::from(new_qp);

        Ok((tx, old_filelink, new_qp))
    }

    /// Adds a new upload paper's details to the database. Sets the `from_library` field to false.
    ///
    /// Returns the database transaction and the id of the uploaded paper
    // pub async fn add_uploaded_paper<'c>(
    //     &self,
    //     file_details:
    // ) -> Result<(Transaction<'c, Postgres>, i32), color_eyre::eyre::Error> {
    // }

    /// Sets the `is_deleted` field to true and `approve_status` to false. Only deletes uploaded papers.
    ///
    /// Returns a boolean that represents whether a db entry was affected or not. If more than one entry was affected, an error will be thrown and the transaction will be rolled back.
    pub async fn soft_delete(&self, id: i32) -> Result<bool, color_eyre::eyre::Error> {
        let mut tx = self.connection.begin().await?;

        let rows_affected = sqlx::query(queries::SOFT_DELETE_BY_ID)
            .bind(id)
            .execute(&mut *tx)
            .await?
            .rows_affected();

        if rows_affected > 1 {
            tx.rollback().await?;
            Err(eyre!(
                "Error: {} (> 1) papers were deleted. Rolling back.",
                rows_affected
            ))
        } else {
            tx.commit().await?;
            Ok(rows_affected == 1)
        }
    }

    /// Returns all papers that match one or more of the specified properties exactly. `course_name` is required, other properties are optional.
    pub async fn get_similar_papers(
        &self,
        course_code: &str,
        year: Option<i32>,
        course_name: Option<&String>,
        semester: Option<&String>,
        exam: Option<&String>,
    ) -> Result<Vec<AdminDashboardQP>, sqlx::Error> {
        let query_sql = queries::get_similar_papers_query(
            year.is_some(),
            course_name.is_some(),
            semester.is_some(),
            exam.is_some(),
        );
        let query = sqlx::query_as(&query_sql).bind(course_code);

        let query = query.bind(year);
        let query = query.bind(course_name);
        let query = query.bind(semester);
        let query = query.bind(exam);

        let papers: Vec<models::DBAdminDashboardQP> = query.fetch_all(&self.connection).await?;

        Ok(papers
            .iter()
            .map(|qp| qp::AdminDashboardQP::from(qp.clone()))
            .collect())
    }

    /// Inserts a new uploaded question paper into the database. Uses a placeholder for the filelink which should be replaced once the id is known using the [crate::db::Database::update_uploaded_filelink] function.
    ///
    /// Returns a tuple with the transaction and the id of the inserted paper.
    pub async fn insert_new_uploaded_qp<'c>(
        &self,
        file_details: &FileDetails,
    ) -> Result<(Transaction<'c, Postgres>, i32), color_eyre::eyre::Error> {
        let mut tx = self.connection.begin().await?;

        let FileDetails {
            course_code,
            course_name,
            year,
            exam,
            semester,
            ..
        } = file_details;

        let query = sqlx::query_as(queries::INSERT_NEW_QP)
            .bind(course_code)
            .bind(course_name)
            .bind(year)
            .bind(exam)
            .bind(semester)
            .bind("placeholder_filelink")
            .bind(false);

        let Breh { id } = query.fetch_one(&mut *tx).await?;

        Ok((tx, id))
    }

    // /// Updates filelink for an uploaded question paper uploaded using the [crate::db::Database::update_uploaded_filelink] function. Takes the same transaction that the previous function used.
    pub async fn update_uploaded_filelink<'c>(
        &self,
        tx: &mut Transaction<'c, Postgres>,
        id: i32,
        file_link: &str,
    ) -> Result<(), color_eyre::eyre::Error> {
        let query = sqlx::query(queries::UPDATE_FILELINK)
            .bind(id)
            .bind(file_link);

        query.execute(&mut **tx).await?;

        Ok(())
    }
}
