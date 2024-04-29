import { IErrorMessage, IQuestionPaperFile } from "../types/types";

export const validate = (data: IQuestionPaperFile): IErrorMessage => {
    const error_message: IErrorMessage = {
        courseCodeErr: null,
        courseNameErr: null,
        yearErr: null,
        examErr: null,
        semesterErr: null,
    };
    if (!data.course_code || data.course_code.length !== 7) {
        error_message.courseCodeErr = "Invalid Course Code";
    }

    if (!data.course_name) error_message.courseNameErr = "Invalid Course Name";

    if (
        !data.year ||
        isNaN(data.year) ||
        data.year > new Date().getFullYear()
    ) {
        error_message.yearErr = "Invalid Year";
    }

    if (!data.exam || (data.exam !== "midsem" && data.exam !== "endsem")) {
        error_message.examErr = "Invalid exam";
    }

    if (
        !data.semester ||
        (data.semester !== "autumn" && data.semester !== "spring")
    ) {
        error_message.examErr = "Invalid semester";
    }

    return error_message;
};
