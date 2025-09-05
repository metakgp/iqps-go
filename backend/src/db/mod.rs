//! Database stuff. See submodules also.

use color_eyre::eyre::eyre;
use models::DBAdminDashboardQP;
use sqlx::{postgres::PgPoolOptions, prelude::FromRow, PgPool, Postgres, Transaction};
use std::time::Duration;

use crate::{
    env::EnvVars,
    pathutils::{PaperCategory, Paths},
    qp::{self, AdminDashboardQP, Exam, LibraryQP, Semester},
    routing::{EditReq, FileDetails},
};

mod models;
mod queries;

#[derive(Clone)]
/// The database
pub struct Database {
    connection: PgPool,
}

#[derive(FromRow)]
/// Needed this to use the `query_as()` function of sqlx. There is probably a better way to do this but this is my first time, sorry.
struct Breh {
    id: i32,
}

impl Database {
    /// Creates a new database connection given the environment variables.
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

    /// Returns the number of unapproved papers
    pub async fn get_unapproved_papers_count(&self) -> Result<i64, sqlx::Error> {
        let count: (i64,) = sqlx::query_as(queries::GET_UNAPPROVED_COUNT)
            .fetch_one(&self.connection)
            .await?;

        Ok(count.0)
    }

    /// Searches for papers from a given query. Uses some voodoo black magic by @rajivharlalka
    pub async fn search_papers(
        &self,
        query: &str,
        exam_filter: Vec<Exam>,
    ) -> Result<Vec<qp::BaseQP>, sqlx::Error> {
        let query_sql = queries::get_qp_search_query(exam_filter);
        let query = sqlx::query_as(&query_sql).bind(query);

        let papers: Vec<models::DBBaseQP> = query.fetch_all(&self.connection).await?;

        Ok(papers
            .iter()
            .map(|qp| qp::BaseQP::from(qp.clone()))
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
    /// - Deletes `replace` papers from the database.
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
            note,
            replace,
        } = edit_req;

        let current_details = self.get_paper_by_id(id).await?;

        // Construct the final values to be inserted into the db
        let course_code = course_code.unwrap_or(current_details.qp.course_code);
        let course_name = course_name.unwrap_or(current_details.qp.course_name);
        let year = year.unwrap_or(current_details.qp.year);
        let semester: String = semester
            .map(|sem| Semester::try_from(&sem))
            .transpose()?
            .unwrap_or(current_details.qp.semester)
            .into();
        let exam: String = exam
            .map(|exam| Exam::try_from(&exam))
            .transpose()?
            .unwrap_or(current_details.qp.exam)
            .into();
        let approve_status = approve_status.unwrap_or(current_details.approve_status);

        // Set the new filelink
        let old_filelink = current_details.qp.filelink;
        let new_filelink = if current_details.qp.from_library {
            old_filelink.clone() // TODO use consistent format
        } else if approve_status {
            env_vars.paths.get_slug(
                &format!(
                    "{}.pdf",
                    Paths::sanitize_path(&format!(
                        "{}_{}_{}_{}_{}_{}",
                        id, course_code, course_name, year, semester, exam
                    ))
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
            .bind(&note)
            .bind(approve_status)
            .bind(&new_filelink);

        let query = if approve_status {
            query.bind(username)
        } else {
            query
        };

        let new_qp: DBAdminDashboardQP = query.fetch_one(&mut *tx).await?;
        let new_qp = AdminDashboardQP::from(new_qp);

        // Delete the replaced papers
        for replace_id in replace {
            let rows_affected = sqlx::query(queries::SOFT_DELETE_ANY_BY_ID)
                .bind(replace_id)
                .execute(&mut *tx)
                .await?
                .rows_affected();

            if rows_affected > 1 {
                tx.rollback().await?;
                return Err(eyre!(
                    "Error: {} (> 1) papers were deleted. Rolling back.",
                    rows_affected
                ));
            }
        }

        Ok((tx, old_filelink, new_qp))
    }

    // /// Adds a new upload paper's details to the database. Sets the `from_library` field to false.
    // ///
    // /// Returns the database transaction and the id of the uploaded paper
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

        let rows_affected = sqlx::query(queries::SOFT_DELETE_ANY_BY_ID)
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

    /// Gets all soft-deleted papers from the database
    pub async fn get_soft_deleted_papers(&self) -> Result<Vec<AdminDashboardQP>, sqlx::Error> {
        let query_sql = queries::get_get_soft_deleted_papers_query();
        let papers: Vec<models::DBAdminDashboardQP> = sqlx::query_as(&query_sql)
            .fetch_all(&self.connection)
            .await?;

        Ok(papers
            .iter()
            .map(|qp| qp::AdminDashboardQP::from(qp.clone()))
            .collect())
    }

    /// Permanently deletes a paper from the database
    pub async fn hard_delete(
        &self,
        id: i32,
    ) -> Result<Transaction<'_, Postgres>, color_eyre::eyre::Error> {
        let mut tx = self.connection.begin().await?;
        let rows_affected = sqlx::query(queries::HARD_DELETE_BY_ID)
            .bind(id)
            .execute(&mut *tx)
            .await?
            .rows_affected();
        if rows_affected > 1 {
            tx.rollback().await?;
            return Err(eyre!(
                "Error: {} (> 1) papers were deleted. Rolling back.",
                rows_affected
            ));
        } else if rows_affected < 1 {
            tx.rollback().await?;
            return Err(eyre!("Error: No papers were deleted."));
        }
        Ok(tx)
    }

    /// Returns all papers that match one or more of the specified properties exactly. `course_name` is required, other properties are optional.
    pub async fn get_similar_papers(
        &self,
        course_code: &str,
        year: Option<i32>,
        semester: Option<&String>,
        exam: Option<&String>,
    ) -> Result<Vec<AdminDashboardQP>, sqlx::Error> {
        let query_sql =
            queries::get_similar_papers_query(year.is_some(), semester.is_some(), exam.is_some());
        let query = sqlx::query_as(&query_sql).bind(course_code);

        let query = query.bind(year);
        let query = query.bind(semester);
        let query = query.bind(exam);

        let papers: Vec<models::DBAdminDashboardQP> = query.fetch_all(&self.connection).await?;

        Ok(papers
            .iter()
            .map(|qp| qp::AdminDashboardQP::from(qp.clone()))
            .collect())
    }

    /// Inserts a new uploaded question paper into the database. Uses a placeholder for the filelink which should be replaced once the id is known using the [crate::db::Database::update_filelink] function.
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
            note,
            ..
        } = file_details;

        let query = sqlx::query_as(queries::INSERT_NEW_QP)
            .bind(course_code)
            .bind(course_name)
            .bind(year)
            .bind(exam)
            .bind(semester)
            .bind(note)
            .bind("placeholder_filelink")
            .bind(false);

        let Breh { id } = query.fetch_one(&mut *tx).await?;

        Ok((tx, id))
    }

    #[allow(unused)]
    /// Inserts a new library question paper into the database. Uses a placeholder for the filelink which should be replaced once the id is known using the [crate::db::Database::update_filelink] function.
    ///
    /// Returns a tuple with the transaction and the id of the inserted paper.
    pub async fn insert_new_library_qp<'c>(
        &self,
        paper: &LibraryQP,
    ) -> Result<(Transaction<'c, Postgres>, i32), color_eyre::eyre::Error> {
        let mut tx = self.connection.begin().await?;

        let LibraryQP {
            course_code,
            course_name,
            year,
            exam,
            semester,
            approve_status,
            ..
        } = paper;

        let query = sqlx::query_as(queries::INSERT_NEW_LIBRARY_QP)
            .bind(course_code)
            .bind(course_name)
            .bind(year)
            .bind(exam)
            .bind(semester)
            .bind("")
            .bind("placeholder_filelink")
            .bind(approve_status);

        let Breh { id } = query.fetch_one(&mut *tx).await?;

        Ok((tx, id))
    }

    /// Updates filelink for an uploaded question paper uploaded using the [crate::db::Database::insert_new_uploaded_qp] or [crate::db::Database::insert_new_library_qp] function. Takes the same transaction that the previous function used.
    pub async fn update_filelink(
        &self,
        tx: &mut Transaction<'_, Postgres>,
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
