import COURSE_CODE_MAP from "../data/courses.json";
import { Exam, IQuestionPaperFile } from "../types/types";

type Courses = {
    [key: string]: string;
};

export const sanitizeQP = (qp: IQuestionPaperFile) => {
    const sanitizedFilename = qp.file.name
        .replace(/[^\w\d\_]/g, "$")
        .replace(/\$+/g, "$");

    const sanitizedCourseName = qp.course_name
        .replace(/[^\w\d\_]/g, "$")
        .replace(/\$+/g, "$");
    return {
        ...qp,
        course_name: sanitizedCourseName,
        file: { ...qp.file, name: sanitizedFilename },
    };
};

export function getCourseFromCode<K extends keyof typeof COURSE_CODE_MAP>(code: string): typeof COURSE_CODE_MAP[K] | null {
    if (code in COURSE_CODE_MAP) {
        return COURSE_CODE_MAP[code as keyof typeof COURSE_CODE_MAP];
    } else {
        return null;
    }
};

export const autofillData = (
    filename: string
): {
    course_code: string;
    course_name: string;
    year: string;
    semester: "spring" | "autumn";
    exam: Exam;
} => {
    const dotIndex = filename.lastIndexOf(".");
    const filenameparts = filename.substring(0, dotIndex).split("_");

    let [course_code, year, exam, semester] = filenameparts;

    if (
        !year ||
        year.length !== 4 ||
        isNaN(parseInt(year)) ||
        parseInt(year) > new Date().getFullYear()
    )
        year = new Date().getFullYear().toString();

    if (!exam || (exam !== "midsem" && exam !== "endsem")) exam = "midsem";

    if (!semester || (semester !== "spring" && semester !== "autumn"))
        semester = new Date().getMonth() > 7 ? "autumn" : "spring";

    return {
        course_code,
        year,
        exam: exam as Exam,
        semester: semester as "spring" | "autumn",
        course_name: getCourseFromCode(course_code) ?? "Unknown Course",
    };
};
