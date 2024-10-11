use color_eyre::eyre::eyre;
use duplicate::duplicate_item;
use serde::Serialize;
use url::Url;

use crate::env::EnvVars;

#[derive(Clone, Copy)]
pub enum Semester {
    Autumn,
    Spring,
    Unknown,
}

impl TryFrom<&String> for Semester {
    type Error = color_eyre::eyre::Error;

    fn try_from(value: &String) -> Result<Self, Self::Error> {
        if value == "autumn" {
            Ok(Semester::Autumn)
        } else if value == "spring" {
            Ok(Semester::Spring)
        } else if value.is_empty() {
            Ok(Semester::Unknown)
        } else {
            Err(eyre!("Error parsing semester: Invalid value."))
        }
    }
}

impl From<Semester> for String {
    fn from(value: Semester) -> Self {
        match value {
            Semester::Autumn => "autumn".into(),
            Semester::Spring => "spring".into(),
            Semester::Unknown => "unknown".into(),
        }
    }
}

#[derive(Clone, Copy)]
pub enum Exam {
    Midsem,
    Endsem,
    CT(Option<usize>),
    Unknown,
}

impl TryFrom<&String> for Exam {
    type Error = color_eyre::eyre::Error;

    fn try_from(value: &String) -> Result<Self, Self::Error> {
        if value == "midsem" {
            Ok(Exam::Midsem)
        } else if value == "endsem" {
            Ok(Exam::Endsem)
        } else if let Some(stripped) = value.strip_prefix("ct") {
            if stripped.is_empty() {
                return Ok(Exam::CT(None));
            }

            if let Ok(i) = stripped.parse::<usize>() {
                Ok(Exam::CT(Some(i)))
            } else {
                Err(eyre!("Error parsing exam: Invalid class test number."))
            }
        } else if value.is_empty() {
            Ok(Exam::Unknown)
        } else {
            Err(eyre!("Error parsing exam: Unknown exam type."))
        }
    }
}

impl From<Exam> for String {
    fn from(value: Exam) -> Self {
        match value {
            Exam::Midsem => "midsem".into(),
            Exam::Endsem => "endsem".into(),
            Exam::Unknown => "unknown".into(),
            Exam::CT(None) => "ct".into(),
            Exam::CT(Some(i)) => format!("ct{}", i),
        }
    }
}

#[duplicate_item(
    StrSerializeType;
    [ Exam ];
    [ Semester ];
)]
impl Serialize for StrSerializeType {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&String::from(*self))
    }
}

#[derive(Serialize, Clone)]
pub struct SearchQP {
    pub id: i32,
    pub filelink: String,
    pub from_library: bool,
    pub course_code: String,
    pub course_name: String,
    pub year: i32,
    pub semester: Semester,
    pub exam: Exam,
}

#[derive(Serialize, Clone)]
pub struct AdminDashboardQP {
    pub id: i32,
    pub filelink: String,
    pub from_library: bool,
    pub course_code: String,
    pub course_name: String,
    pub year: i32,
    pub semester: Semester,
    pub exam: Exam,
    pub upload_timestamp: String,
    pub approve_status: bool,
}

#[duplicate_item(
    QP;
    [ SearchQP ];
    [ AdminDashboardQP ];
)]
impl QP {
    pub fn with_url(self, env_vars: &EnvVars) -> Result<Self, color_eyre::eyre::Error> {
        let url = Url::parse(&env_vars.static_files_url)?;
        let url = url.join(&self.filelink)?;

        Ok(Self {
            filelink: url.to_string(),
            ..self
        })
    }
}
