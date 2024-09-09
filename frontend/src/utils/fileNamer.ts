import { IAdminQuestionPaperResult } from "../types/question_paper";

export function fileNamer (qp: IAdminQuestionPaperResult) {
    let exam = qp.exam === "endsem" ? "E" : "M";
    let sem = qp.semester === "autumn" ? "A" : "S";
    return `${qp.course_code}_${exam}${sem}_${qp.year}.pdf`;
}