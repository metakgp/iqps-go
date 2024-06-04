import { AiOutlineFilePdf as PDFIcon } from "solid-icons/ai";
import { Component } from "solid-js";
import { IAdminQuestionPaperResult } from "../types/types";

type qp = {
    questionPaper: IAdminQuestionPaperResult;
}

export const ListElement: Component<qp> = (qp) => {
    return (
        <tr>
            <td>{qp.questionPaper.year}</td>
            <td>{qp.questionPaper.course_code}</td>
            <td>{qp.questionPaper.course_name}</td>
            <td>{qp.questionPaper.exam}</td>
            <td>{qp.questionPaper.semester}</td>
            <td>{qp.questionPaper.approval}</td>
            <td><PDFIcon/><a href={qp.questionPaper.filelink} target="_blank">{qp.questionPaper.course_code}.pdf</a></td>
        </tr>
    )
}
