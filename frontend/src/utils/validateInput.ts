import { ErrorMessage, QuestionPaper } from "../types/types";

export const validate = (data: QuestionPaper): ErrorMessage => {
    const valid = {
        course_code: "",
        course_name: "",
        year: "",
        exam: "",
        semester: "",
    };
    if (!data.course_code || data.course_code.length !== 7)
        valid.course_code = "Invalid Course Code";

    if (!data.course_name) valid.course_name = "Invalid Course Name";

    if (
        !data.year ||
        isNaN(parseInt(data.year)) ||
        parseInt(data.year) > new Date().getFullYear()
    )
        valid.year = "Invalid Year";

    if (!data.exam || (data.exam !== "midsem" && data.exam !== "endsem"))
        valid.exam = "Invalid exam";

    if (
        !data.semester ||
        (data.semester !== "autumn" && data.semester !== "spring")
    )
        valid.exam = "Invalid semester";

    return valid;
};
