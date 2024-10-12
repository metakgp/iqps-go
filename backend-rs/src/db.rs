use color_eyre::eyre::{eyre, ContextCompat};
use queries::get_qp_search_query;
use sqlx::{postgres::PgPoolOptions, PgPool, Postgres, Transaction};
use std::time::Duration;

use crate::{
    env::EnvVars,
    qp::{self, Exam, Semester},
};

#[derive(Clone)]
pub struct Database {
    connection: PgPool,
}

pub struct EditDetails {
    pub course_code: String,
    pub course_name: String,
    pub year: i32,
    pub semester: Semester,
    pub exam: Exam,
    pub approve_status: bool,
}

impl Database {
    pub async fn try_new(env_vars: &EnvVars) -> Result<Self, sqlx::Error> {
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

    pub async fn get_unapproved_papers(&self) -> Result<Vec<qp::AdminDashboardQP>, sqlx::Error> {
        let papers: Vec<models::DBAdminDashboardQP> = sqlx::query_as(queries::GET_ALL_UNAPPROVED)
            .fetch_all(&self.connection)
            .await?;

        Ok(papers
            .iter()
            .map(|qp| qp::AdminDashboardQP::from(qp.clone()))
            .collect())
    }

    pub async fn search_papers(
        &self,
        query: &String,
        exam: Option<Exam>,
    ) -> Result<Vec<qp::SearchQP>, sqlx::Error> {
        let query_sql = get_qp_search_query(exam.is_some());
        let query = sqlx::query_as(&query_sql).bind(query);

        let query = if let Some(exam) = exam {
            query.bind(String::from(exam))
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
        let query = sqlx::query_as(queries::GET_PAPER_BY_ID).bind(id);

        let paper: models::DBAdminDashboardQP = query.fetch_one(&self.connection).await?;

        Ok(paper.into())
    }

    /// Edit's a paper's details.
    ///
    /// - If the paper is approved, the filename is also changed and it is moved to `/static_file_storage_location/uploaded_qps_path/approved/`.
    /// - If the paper is unapproved, the file is not moved again, same goes for library papers.
    /// - Sets the `approved_by` field to the username if approved.
    ///
    /// Returns the database transaction and the new filelink
    pub async fn edit_paper<'c>(
        &self,
        id: i32,
        edit_details: EditDetails,
        newly_approved: bool,
        username: &str,
        env_vars: &EnvVars,
    ) -> Result<(Transaction<'c, Postgres>, String), color_eyre::eyre::Error> {
        let mut tx = self.connection.begin().await?;

        let EditDetails {
            course_code,
            course_name,
            year,
            semester,
            exam,
            approve_status,
        } = edit_details;

        let semester = String::from(semester);
        let exam = String::from(exam);

        let query_sql = queries::get_edit_paper_query(newly_approved);
        let query = sqlx::query(&query_sql)
            .bind(id)
            .bind(&course_code)
            .bind(&course_name)
            .bind(year)
            .bind(&semester)
            .bind(&exam)
            .bind(approve_status);

        let filelink = env_vars
            .get_uploaded_paper_slugs()
            .approved
            .join(format!(
                "{}_{}_{}_{}_{}_{}.pdf",
                id, course_code, course_name, year, semester, exam
            ))
            .to_str()
            .context("Error converting approved papers path to string.")?
            .to_owned();

        let query = if newly_approved {
            query.bind(&filelink).bind(username)
        } else {
            query
        };

        let rows_affected = query.execute(&mut *tx).await?.rows_affected();

        if rows_affected != 1 {
            tx.rollback().await?;

            return Err(eyre!(
                "An invalid number of rows were changed: {}",
                rows_affected
            ));
        }

        Ok((tx, filelink))
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

        let rows_affected = sqlx::query(queries::SOFT_DELETE_BY_ID).bind(id).execute(&mut *tx).await?.rows_affected();

        if rows_affected > 1 {
            tx.rollback().await?;
            Err(eyre!("Error: {} (> 1) papers were deleted. Rolling back.", rows_affected))
        } else {
            tx.commit().await?;
            Ok(rows_affected == 1)
        }
    }
}

mod models {
    use crate::qp::Semester;

    use super::qp;
    use sqlx::{prelude::FromRow, types::chrono};

    #[derive(FromRow, Clone)]
    pub struct DBSearchQP {
        id: i32,
        filelink: String,
        from_library: bool,
        course_code: String,
        course_name: String,
        year: i32,
        semester: String,
        exam: String,
    }

    #[derive(FromRow, Clone)]
    pub struct DBAdminDashboardQP {
        id: i32,
        filelink: String,
        from_library: bool,
        course_code: String,
        course_name: String,
        year: i32,
        semester: String,
        exam: String,
        upload_timestamp: chrono::NaiveDateTime,
        approve_status: bool,
    }

    impl From<DBAdminDashboardQP> for qp::AdminDashboardQP {
        fn from(value: DBAdminDashboardQP) -> Self {
            Self {
                id: value.id,
                filelink: value.filelink,
                from_library: value.from_library,
                course_code: value.course_code,
                course_name: value.course_name,
                year: value.year,
                semester: (&value.semester).try_into().unwrap_or(Semester::Unknown),
                exam: (&value.exam).try_into().unwrap_or(qp::Exam::Unknown),
                upload_timestamp: value.upload_timestamp.to_string(),
                approve_status: value.approve_status,
            }
        }
    }

    impl From<DBSearchQP> for qp::SearchQP {
        fn from(value: DBSearchQP) -> Self {
            Self {
                id: value.id,
                filelink: value.filelink,
                from_library: value.from_library,
                course_code: value.course_code,
                course_name: value.course_name,
                year: value.year,
                semester: (&value.semester).try_into().unwrap_or(Semester::Unknown),
                exam: (&value.exam).try_into().unwrap_or(qp::Exam::Unknown),
            }
        }
    }
}

mod queries {
    /// Soft deletes a paper (sets `approve_status` to false and `is_deleted` to true) of an uploaded paper.
    pub const SOFT_DELETE_BY_ID: &str = "UPDATE iqps SET approve_status=false, is_deleted = true WHERE id=$1 AND from_library = false";

    /// Get a paper ([`crate::db::models::DBAdminDashboardQP`]) with the given id (first parameter `$1`)
    pub const GET_PAPER_BY_ID: &str = "SELECT id, filelink, from_library, course_code, course_name, year, semester, exam, upload_timestamp, approve_status FROM iqps WHERE id = $1";

    /// Returns a query that updates a paper's details by id ($1) (course_code, course_name, year, semester, exam, approve_status). `filelink` and `approved_by` optionally included if the edit is also used for approval.
    ///
    /// Query parameters:
    /// - $1: `id`
    /// - $2: `course_code`
    /// - $3: `course_name`
    /// - $4: `year`
    /// - $5: `semester`
    /// - $6: `exam`
    /// - $7: `approve_status`
    /// - $8: `filelink`
    /// - $9: `approved_by`
    pub fn get_edit_paper_query(approval: bool) -> String {
        format!(
            "UPDATE iqps set course_code=$2, course_name=$3, year=$4, semester=$5, exam=$6, approve_status=$7{} WHERE id=$1 AND is_deleted=false",
            if approval {", filelink=$8, approved_by=$9"} else {""}
        )
    }

    /// Gets all unapproved papers ([`crate::db::models::DBAdminDashboardQP`]) from the database
    pub const GET_ALL_UNAPPROVED: &str = "SELECT id, filelink, from_library, course_code, course_name, year, semester, exam, upload_timestamp, approve_status FROM iqps WHERE approve_status = false and is_deleted=false ORDER BY upload_timestamp ASC";

    /// Searches for papers using the given query_text (parameter `$1`). This is total voodoo by Rajiv Harlalka. The second parameter can be used to filter by exam.
    /// // TODO: @Rajiv please update this documentation to explain the voodoo.
    const QP_SEARCH: &str = "
with fuzzy as (
    select id,
           similarity(course_code || ' ' || course_name, $1) as sim_score,
           row_number() over (order by similarity(course_code || ' ' || course_name, $1) desc) as rank_ix
    from iqps
    where (course_code || ' ' || course_name) %>> $1 AND approve_status = true
    order by rank_ix
    limit 30
),
full_text as (
  select
    id,
    ts_rank_cd(fts_course_details, websearch_to_tsquery($1)) as rank_score,
    row_number() over(order by ts_rank_cd(fts_course_details , websearch_to_tsquery($1)) desc) as rank_ix
  from
    iqps
  where
    fts_course_details @@ websearch_to_tsquery($1)
    AND approve_status = true
  order by rank_ix
  limit 30
),
partial_search as (
  select id,
    ts_rank_cd(fts_course_details , to_tsquery('simple', websearch_to_tsquery('simple', $1)::text || ':*' )) as rank_score,
    row_number() over(order by ts_rank_cd(fts_course_details , to_tsquery('simple', websearch_to_tsquery('simple', $1)::text || ':*' )) desc) as rank_ix
  from iqps where
      fts_course_details @@ to_tsquery(
        'simple',
        websearch_to_tsquery('simple', $1)::text || ':*'
      )
      AND approve_status = true
  limit 30
),  result as (
  select
  iqps.id,iqps.course_code, iqps.course_name, iqps.year, iqps.exam, iqps.filelink, iqps.from_library, iqps.upload_timestamp, iqps.approve_status, iqps.semester
from
  fuzzy
  full outer join full_text on fuzzy.id = full_text.id
  full outer join partial_search on coalesce(fuzzy.id, full_text.id) = partial_search.id
  join iqps on coalesce(fuzzy.id, full_text.id, partial_search.id) = iqps.id
order by
  coalesce(1.0 / (50 + fuzzy.rank_ix), 0.0) * 1 +
  coalesce(1.0 / (50 + full_text.rank_ix), 0.0) * 1 +
  coalesce(1.0 / (50 + partial_search.rank_ix), 0.0) * 1
  desc
)
  select * from result";

    pub fn get_qp_search_query(exam: bool) -> String {
        let mut query = QP_SEARCH.to_owned();

        if exam {
            query.push_str(" where (exam = $2 or exam = '')");
        }

        query
    }
}
