pub enum Semester {
    Autumn,
    Spring,
    Unknown,
}

impl TryFrom<String> for Semester {
    type Error = Box<dyn std::error::Error>;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        if value == "autumn" {
            Ok(Semester::Autumn)
        } else if value == "spring" {
            Ok(Semester::Spring)
        } else if value == "" {
            Ok(Semester::Unknown)
        } else {
            Err("Error parsing semester: Invalid value.".into())
        }
    }
}

impl From<Semester> for String {
    fn from(value: Semester) -> Self {
        match value {
            Semester::Autumn => "autumn".into(),
            Semester::Spring => "semester".into(),
            Semester::Unknown => "unknown".into(),
        }
    }
}

pub enum Exam {
    Midsem,
    Endsem,
    CT(usize),
    Unknown,
}

impl TryFrom<String> for Exam {
    type Error = Box<dyn std::error::Error>;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        if value == "midsem" {
            Ok(Exam::Midsem)
        } else if value == "endsem" {
            Ok(Exam::Endsem)
        } else if value.starts_with("ct") {
            if let Ok(i) = value[2..].parse::<usize>() {
                Ok(Exam::CT(i))
            } else {
                Err("Error parsing exam: Invalid class test number.".into())
            }
        } else if value == "" {
            Ok(Exam::Unknown)
        } else {
            Err("Error parsing exam: Unknown exam type.".into())
        }
    }
}

impl From<Exam> for String {
    fn from(value: Exam) -> Self {
        match value {
            Exam::Midsem => "midsem".into(),
            Exam::Endsem => "endsem".into(),
            Exam::CT(i) => format!("ct{}", i),
            Exam::Unknown => "unknown".into(),
        }
    }
}

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
