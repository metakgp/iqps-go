//! Database models.
//!
//! These can be (should be) converted to the structs in [`crate::qp`] for sending as a response since the struct also parses the `semester` and `exam` fields and also generates the full static files URL.
//!
//! Use the [`From`] trait implementations.

use crate::qp::Semester;

use super::qp;
use sqlx::{prelude::FromRow, types::chrono};

#[derive(FromRow, Clone)]
/// Base/common fields of a question paper
pub struct DBBaseQP {
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
/// The fields of a question paper sent to the admin dashboard endpoint
pub struct DBAdminDashboardQP {
    #[sqlx(flatten)]
    qp: DBBaseQP,
    upload_timestamp: chrono::NaiveDateTime,
    approve_status: bool,
}

impl From<DBAdminDashboardQP> for qp::AdminDashboardQP {
    fn from(value: DBAdminDashboardQP) -> Self {
        Self {
            qp: value.qp.into(),
            upload_timestamp: value.upload_timestamp.to_string(),
            approve_status: value.approve_status,
        }
    }
}

impl From<DBBaseQP> for qp::BaseQP {
    fn from(value: DBBaseQP) -> Self {
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
