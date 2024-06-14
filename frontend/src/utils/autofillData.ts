import COURSE_CODE_MAP from "../data/courses.json";
import { Exam, IQuestionPaper, IQuestionPaperFile, Semester } from "../types/types";

type Courses = {
    [key: string]: string;
};

export const sanitizeQP = (qp: IQuestionPaperFile) => {
    const sanitizedFilename = qp.file.name
        .replace(/[^\w\d\_]/g, "-")
        .replace(/\$+/g, "$");

    const sanitizedCourseName = qp.course_name
        .replace(/[^\w\d\_]/g, "-")
        .replace(/\$+/g, "$");

    return {
        ...qp,
        course_name: sanitizedCourseName,
        file_name: sanitizedFilename,
        file: qp.file,
    };
};

export function getCourseFromCode<K extends keyof typeof COURSE_CODE_MAP>(code: string): typeof COURSE_CODE_MAP[K] | null {
    if (code.toUpperCase() in COURSE_CODE_MAP) {
        return COURSE_CODE_MAP[code.toUpperCase() as keyof typeof COURSE_CODE_MAP];
    } else {
        return null;
    }
};

export function getCodefromCourse<K extends keyof typeof COURSE_CODE_MAP>(course: string): typeof COURSE_CODE_MAP[K] | null {
    return Object.keys(COURSE_CODE_MAP).find((key) => COURSE_CODE_MAP[key] === course);
};

export const autofillData = (
    filename: string
): IQuestionPaper => {
    // Split filename at underscores
    const dotIndex = filename.lastIndexOf(".");
    const filenameparts = filename.substring(0, dotIndex).split("_");

    const [course_code, year, exam, semester] = filenameparts;

    const qpDetails: IQuestionPaper = {
        course_code,
        year: new Date().getFullYear(),
        exam: "midsem",
        semester: new Date().getMonth() > 7 ? "autumn" : "spring",
        course_name: getCourseFromCode(course_code) ?? "Unknown Course",
    }

    if (
        year &&
        year.length === 4 && // Someome will fix this in year 10000 if metaKGP and KGP still exist then. Until then, it will at least prevent lazy asses from writing 21 instead of 2021
        !isNaN(parseInt(year)) &&
        parseInt(year) <= new Date().getFullYear() // Imagine sending a question paper from the future, should we support this just in case? I mean metaKGP are pioneers in technology, shouldn't we support other pioneers on our system too?
    ) qpDetails.year = parseInt(year);

    if (exam && (exam.toLowerCase() === "midsem" || exam.toLowerCase() === "endsem")) qpDetails.exam = exam.toLowerCase() as Exam;

    if (semester && (semester.toLowerCase() === "spring" || semester.toLowerCase() === "autumn")) qpDetails.semester = semester.toLowerCase() as Semester;

    return qpDetails;
};
