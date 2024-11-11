//! SQL queries for the database.
//!
//! Some of these are functions that return a query that is dynamically generated based on requirements.

/// Query to get similar papers. Matches `course_code` ($1) always. Other parameters are optional and can be enabled or disabled using the arguments to this function.
pub fn get_similar_papers_query(
    year: bool,
    course_name: bool,
    semester: bool,
    exam: bool,
) -> String {
    let mut param_num = 1;

    format!(
        "SELECT {} from iqps where is_deleted=false and course_code = $1 {} {} {} {}",
        ADMIN_DASHBOARD_QP_FIELDS,
        if year {
            param_num += 1;
            format!("AND year=${}", param_num)
        } else {
            "".to_string()
        },
        if course_name {
            param_num += 1;
            format!("AND course_name=${}", param_num)
        } else {
            "".to_string()
        },
        if semester {
            param_num += 1;
            format!("AND semester=${}", param_num)
        } else {
            "".to_string()
        },
        if exam {
            param_num += 1;
            format!("AND exam=${}", param_num)
        } else {
            "".to_string()
        },
    )
}

/// Soft deletes a paper (sets `approve_status` to false and `is_deleted` to true) of an uploaded paper.
pub const SOFT_DELETE_BY_ID: &str =
    "UPDATE iqps SET approve_status=false, is_deleted = true WHERE id=$1 AND from_library = false";

/// Get a paper ([`crate::db::models::DBAdminDashboardQP`]) with the given id (first parameter `$1`)
pub fn get_get_paper_by_id_query() -> String {
    format!(
        "SELECT {} FROM iqps WHERE id = $1",
        ADMIN_DASHBOARD_QP_FIELDS
    )
}

/// Returns a query that updates a paper's details by id ($1) (course_code, course_name, year, semester, exam, approve_status, filelink). `approved_by` optionally included if the edit is also used for approval.
///
/// The query also returns all the admin dashboard qp fields of the edited paper
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
		"UPDATE iqps set course_code=$2, course_name=$3, year=$4, semester=$5, exam=$6, approve_status=$7, filelink=$8{} WHERE id=$1 AND is_deleted=false RETURNING {}",
		if approval {", approved_by=$9"} else {""},
        ADMIN_DASHBOARD_QP_FIELDS
	)
}

/// Gets all unapproved papers ([`crate::db::models::DBAdminDashboardQP`]) from the database
pub fn get_all_unapproved_query() -> String {
    format!("SELECT {} FROM iqps WHERE approve_status = false and is_deleted=false ORDER BY upload_timestamp ASC", ADMIN_DASHBOARD_QP_FIELDS)
}

/// Returns the query for searching question papers. It is mostly voodoo, @Rajiv please update the documentation.
///
/// Optionally, the `exam` argument can be used to also add a clause to match the exam field.
pub fn get_qp_search_query(exam: bool) -> String {
    let exam_filter = if exam {
        "WHERE (exam = $2 OR exam = '')"
    } else {
        ""
    };

    format!("
        WITH filtered AS (
            SELECT * from iqps {exam_filter}
        ),
        fuzzy AS (
            SELECT id,
            similarity(course_code || ' ' || course_name, $1) AS sim_score,
            row_number() OVER (ORDER BY similarity(course_code || ' ' || course_name, $1) DESC) AS rank_ix
            FROM filtered
            WHERE (course_code || ' ' || course_name) %>> $1 AND approve_status = true
            ORDER BY rank_ix
            LIMIT 30
        ),
        full_text AS (
            SELECT id,
                ts_rank_cd(fts_course_details, websearch_to_tsquery($1)) AS rank_score,
                row_number() OVER (ORDER BY ts_rank_cd(fts_course_details, websearch_to_tsquery($1)) DESC) AS rank_ix
            FROM filtered
            WHERE fts_course_details @@ websearch_to_tsquery($1) AND approve_status = true
            ORDER BY rank_ix
            LIMIT 30
        ),
        partial_search AS (
            SELECT id,
                ts_rank_cd(fts_course_details, {to_tsquery}) AS rank_score,
                row_number() OVER (ORDER BY ts_rank_cd(fts_course_details, {to_tsquery}) DESC) as rank_ix
            FROM filtered
            WHERE fts_course_details @@ {to_tsquery} AND approve_status = true
            LIMIT 30
        ),
        result AS (
            SELECT {intermediate_fields}
            FROM fuzzy
                FULL OUTER JOIN full_text ON fuzzy.id = full_text.id
                FULL OUTER JOIN partial_search ON coalesce(fuzzy.id, full_text.id) = partial_search.id
                JOIN filtered ON coalesce(fuzzy.id, full_text.id, partial_search.id) = filtered.id
            ORDER BY
                coalesce(1.0 / (50 + fuzzy.rank_ix), 0.0) * 1 +
                coalesce(1.0 / (50 + full_text.rank_ix), 0.0) * 1 +
                coalesce(1.0 / (50 + partial_search.rank_ix), 0.0) * 1
            DESC
        ) SELECT {search_qp_fields} FROM result",
        search_qp_fields = SEARCH_QP_FIELDS,
        to_tsquery = "to_tsquery('simple', websearch_to_tsquery('simple', $1)::text || ':*')",
        exam_filter = exam_filter,
        intermediate_fields = ADMIN_DASHBOARD_QP_FIELDS.split(", ").map(|field| format!("filtered.{}", field)).collect::<Vec<String>>().join(", ")
    )
}

/// List of fields in the [`crate::db::models::DBAdminDashboardQP`] to be used with SELECT clauses
pub const ADMIN_DASHBOARD_QP_FIELDS: &str = "id, filelink, from_library, course_code, course_name, year, semester, exam, upload_timestamp, approve_status";

/// List of fields in the [`crate::db::models::DBSearchQP`] to be used with SELECT clauses
pub const SEARCH_QP_FIELDS: &str =
    "id, filelink, from_library, course_code, course_name, year, semester, exam";

/// Insert a newly uploaded file in the db (and return the id)
/// Parameters in the following order: `course_code`, `course_name`, `year`, `exam`, `semester`, `filelink`, `from_library`
pub const INSERT_NEW_QP: &str = "INSERT INTO iqps (course_code, course_name, year, exam, semester, filelink, from_library) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id";

/// Updates the filelink ($2) of a paper with the given id ($1). Used to update the filelink after a paper is uploaded.
pub const UPDATE_FILELINK: &str = "UPDATE iqps SET filelink=$2 WHERE id=$1";
