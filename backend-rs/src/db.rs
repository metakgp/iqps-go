use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;

use crate::{
    env::EnvVars,
    qp::{self, Exam},
};

type Error = Box<dyn std::error::Error>;

#[derive(Clone)]
pub struct Database {
    connection: PgPool,
}

impl Database {
    pub async fn try_new(env_vars: &EnvVars) -> Result<Self, Error> {
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

    pub async fn get_unapproved_papers(&self) -> Result<Vec<qp::AdminDashboardQP>, Error> {
        let papers: Vec<models::DBAdminDashboardQP> = sqlx::query_as(queries::GET_ALL_UNAPPROVED)
            .fetch_all(&self.connection)
            .await?;

        Ok(papers
            .iter()
            .map(|qp| qp::AdminDashboardQP::from(qp.clone()))
            .collect())
    }

    pub async fn search_papers(&self, query: String, exam: Option<Exam>) -> Result<Vec<qp::SearchQP>, Error> {
        let query = sqlx::query_as(queries::QP_SEARCH).bind(query);

        let query = if let Some(exam) = exam {
            query.bind(String::from(exam))
        } else {
            query.bind(String::from(""))
        };

        let papers: Vec<models::DBSearchQP> = query.fetch_all(&self.connection).await?;

        Ok(
            papers
            .iter()
            .map(|qp| qp::SearchQP::from(qp.clone()))
            .collect()
        )
    }
}

mod models {
    use crate::qp::Semester;

    use super::qp;
    use sqlx::prelude::FromRow;

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
        upload_timestamp: String,
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
                semester: value.semester.try_into().unwrap_or(Semester::Unknown),
                exam: value.exam.try_into().unwrap_or(qp::Exam::Unknown),
                upload_timestamp: value.upload_timestamp,
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
                semester: value.semester.try_into().unwrap_or(Semester::Unknown),
                exam: value.exam.try_into().unwrap_or(qp::Exam::Unknown),
            }
        }
    }
}

mod queries {
    /// Gets all unapproved papers ([`crate::db::models::DBAdminDashboardQP`]) from the database
    pub const GET_ALL_UNAPPROVED: &str = "SELECT id, filelink, from_library, course_code, course_name, year, semester, exam, upload_timestamp, approve_status FROM iqps WHERE approve_status = false and is_deleted=false ORDER BY upload_timestamp ASC";

    /// Searches for papers using the given query_text (parameter `$1`). This is total voodoo by Rajiv Harlalka. The second parameter can be used to filter by exam.
    /// // TODO: @Rajiv please update this documentation to explain the voodoo.
    pub const QP_SEARCH: &str = "
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
  select * from result (exam = $2 OR exam = '')
";
}
