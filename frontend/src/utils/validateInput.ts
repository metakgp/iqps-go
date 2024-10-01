import { IAdminDashboardQP, IErrorMessage, IQuestionPaperFile } from "../types/question_paper";

export const validateCourseCode = (course_code: string): boolean => {
    return course_code.length === 7 && course_code.match(/[a-z]{2}\d{5}/i) !== null;
}

export const validateYear = (year: number): boolean => {
    return !isNaN(year) && year <= new Date().getFullYear();
}

export const validateExam = (exam: string, strictCt: boolean = false): boolean => {
    return exam === "midsem"
        || exam === "endsem"
        || (
            exam.startsWith('ct') &&
            (
                parseInt(exam.slice(2)) >= 0 || // Yes, class test 0 is allowed.
                !strictCt // Only check for number if strict ct is true
            )
        );
}

export const validateSemester = (semester: string): boolean => {
    return semester === "autumn" || semester === "spring";
}

export const validate = (data: IQuestionPaperFile | IAdminDashboardQP): IErrorMessage => {
    const error_message: IErrorMessage = {
        courseCodeErr: null,
        courseNameErr: null,
        yearErr: null,
        examErr: null,
        semesterErr: null,
    };
    if (!data.course_code || !validateCourseCode(data.course_code)) {
        error_message.courseCodeErr = "Invalid Course Code";
    }

    if (!data.course_name || data.course_name.trim().toLowerCase() === 'unknown course') error_message.courseNameErr = "Invalid Course Name";

    if (
        !data.year ||
        !validateYear(data.year)
    ) {
        error_message.yearErr = "Invalid Year";
    }

    if (!data.exam || !validateExam(data.exam, true)) {
        error_message.examErr = "Invalid exam";
    }

    if (
        !data.semester ||
        !validateSemester(data.semester)
    ) {
        error_message.semesterErr = "Invalid semester";
    }

    return error_message;
};

export const isQPValid = (data: IQuestionPaperFile | IAdminDashboardQP) => {
    return !Object.values(validate(data)).some(Boolean);
};