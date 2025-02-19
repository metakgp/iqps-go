//! Utils for parsing question paper details

use color_eyre::eyre::eyre;
use duplicate::duplicate_item;
use serde::Deserialize;
use serde::Serialize;

use crate::env::EnvVars;

#[derive(Clone, Copy)]
/// Represents a semester.
///
/// It can be parsed from a [`String`] using the `.try_from()` function. An error will be returned if the given string has an invalid value.
///
/// This value can be converted back into a [`String`] using the [`From`] trait implementation.
pub enum Semester {
    /// Autumn semester, parsed from `autumn`
    Autumn,
    /// Spring semester, parsed from `spring`
    Spring,
    /// Unknown/wildcard semester, parsed from an empty string.
    ///
    /// Note that this is different from an invalid value and is used to represent papers for which the semester is not known. An invalid value would be `puppy` or `Hippopotomonstrosesquippedaliophobia` for example.
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
            Semester::Unknown => "".into(),
        }
    }
}

#[derive(Clone, Copy)]
/// Represents the exam type of the paper.
///
/// Can be converted to and parsed from a String using the [`From`] and [`TryFrom`] trait implementations.
pub enum Exam {
    /// Mid-semester examination, parsed from `midsem`
    Midsem,
    /// End-semester examination, parsed from `endsem`
    Endsem,
    /// Class test, parsed from either `ct` or `ct` followed by a number (eg: `ct1` or `ct10`).
    ///
    /// The optional number represents the number of the class test (eg: class test 1 or class test 21). This will be None if the number is not known, parsed from `ct`.
    CT(Option<usize>),
    /// Unknown class test, parsed from an empty string.
    ///
    /// Note that this is different from an invalid value and is used to represent papers for which the exam is not known. An invalid value would be `catto` or `metakgp` for example.
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
                Ok(Exam::CT(None))
            } else if let Ok(i) = stripped.parse::<usize>() {
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
            Exam::Unknown => "".into(),
            Exam::CT(None) => "ct".into(),
            Exam::CT(Some(i)) => format!("ct{}", i),
        }
    }
}

#[duplicate_item(
    Serializable;
    [ Exam ];
    [ Semester ];
)]
impl Serialize for Serializable {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&String::from(*self))
    }
}

pub trait WithUrl: Sized {
    /// Returns the question paper with the full static files URL in the `filelink` field instead of just the slug. See the [`crate::pathutils`] module for what a slug is.
    fn with_url(self, env_vars: &EnvVars) -> Result<Self, color_eyre::eyre::Error>;
}

#[derive(Deserialize)]
/// The details for a question paper in the library
pub struct LibraryQP {
    pub course_code: String,
    pub course_name: String,
    pub year: i32,
    pub exam: String,
    pub semester: String,
    pub filename: String,
    pub approve_status: bool,
}

#[derive(Serialize, Clone)]
/// The fields of a question paper sent from the search endpoint
pub struct BaseQP {
    pub id: i32,
    pub filelink: String,
    pub from_library: bool,
    pub course_code: String,
    pub course_name: String,
    pub year: i32,
    pub semester: Semester,
    pub exam: Exam,
    pub note: String,
}

#[derive(Serialize, Clone)]
/// The fields of a question paper sent from the admin dashboard endpoints.
///
/// This includes fields such as `approve_status` and `upload_timestamp` that would only be relevant to the dashboard.
pub struct AdminDashboardQP {
    #[serde(flatten)]
    pub qp: BaseQP,
    pub upload_timestamp: String,
    pub approve_status: bool,
}

impl WithUrl for BaseQP {
    fn with_url(self, env_vars: &EnvVars) -> Result<Self, color_eyre::eyre::Error> {
        Ok(Self {
            filelink: env_vars.paths.get_url_from_slug(&self.filelink)?,
            ..self
        })
    }
}

impl WithUrl for AdminDashboardQP {
    fn with_url(self, env_vars: &EnvVars) -> Result<Self, color_eyre::eyre::Error> {
        Ok(Self {
            qp: self.qp.with_url(env_vars)?,
            ..self
        })
    }
}
