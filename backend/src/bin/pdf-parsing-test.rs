use std::error::Error;

use pdf2image::{RenderOptionsBuilder, PDF};
use regex::{Regex, RegexBuilder};
use rusty_tesseract::{Args, Image};

struct QPRegexPats {
    /// Matches a course code in the format XXYYYYY where XX are letters and YYYYY are numbers
    course_code: Regex,
    /// Matches a course code with spaces - `XX YYYYY`
    course_code_space: Regex,
    /// Matches an exam type - Mid, End, or Class Test
    exam_type: Regex,
    /// Matches a semester type - Spring/Autumn
    sem_type: Regex,
    /// Matches pairs of (academic) years in the format 20xx-yy or 20xx-20yy
    /// **TODO**: This must be updated in the year 3000
    year_pair_pat: Regex,
    // Matches years of the format 20xx
    // **TODO**: This must be updated in the year 3000
    year_pat: Regex,
}

impl QPRegexPats {
    fn try_new() -> Result<Self, regex::Error> {
        Ok(Self {
            course_code: RegexBuilder::new(r"[^\w]*([A-Z]{2}\d{5})[^\w]*")
                .case_insensitive(true)
                .build()?,
            course_code_space: RegexBuilder::new(r"[^\w]*([A-Z]{2}\s*\d{5})[^\w]*")
                .case_insensitive(true)
                .build()?,
            exam_type: RegexBuilder::new(r"[^\w]*(Mid|End|Class Test)[^\w]*")
                .case_insensitive(true)
                .build()?,
            sem_type: RegexBuilder::new(r"[^\w]*(spring|autumn)[^\w]*")
                .case_insensitive(true)
                .build()?,
            year_pair_pat: RegexBuilder::new(r"([^\d]|^)(2[\d]{3})-(2[\d]{3}|[\d]{2})([^\d]|$)")
                .case_insensitive(true)
                .build()?,
            year_pat: RegexBuilder::new(r"([^\d]|^)(2\d{3})([^\d]|$)")
                .case_insensitive(true)
                .build()?,
        })
    }
}

struct QPHeader {
    course_code: Option<String>,
    course_name: Option<String>,
    semester: Option<String>,
    exam: Option<String>,
    note: Option<String>,
    year: Option<u32>,

    page: usize,
}

fn main() -> Result<(), Box<dyn Error>> {
    let pdf = PDF::from_file("scanned.pdf").unwrap();
    let pages = pdf.render(
        pdf2image::Pages::Range(1..=8),
        RenderOptionsBuilder::default()
            .greyscale(true)
            .pdftocairo(true)
            .build()?,
    )?;

    let pats = QPRegexPats::try_new()?;

    for page in pages.iter() {
        let default_args = Args::default();
        let img = Image::from_dynamic_image(page)?;
        let output = rusty_tesseract::image_to_string(&img, &default_args)?;

        let header = output
            .lines()
            .filter(|line| !line.trim().is_empty())
            .take(15)
            .collect::<Vec<_>>()
            .join("\n");

        let course_code = pats
            .course_code
            .captures_iter(&header)
            .map(|capture| capture.extract::<1>().1[0])
            .next();

        let course_code = if course_code.is_none() {
            pats.course_code_space
                .captures_iter(&header)
                .map(|capture| capture.extract::<1>().1[0])
                .next()
        } else {
            course_code
        };
    }

    Ok(())
}
