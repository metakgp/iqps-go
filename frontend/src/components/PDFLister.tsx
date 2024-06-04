import { AiOutlineFilePdf as PDFIcon } from "solid-icons/ai";
import { Component, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { Exam, IAdminQuestionPaperResult, Semester, approvalStatus } from "../types/types";

type props = {
    questionPaper: IAdminQuestionPaperResult;
    isEditMode: boolean;
}

export const ListElement: Component<props> = (props) => {
    const [questionPaperDetails, setQuestionPaperDetails] = createStore<IAdminQuestionPaperResult>(props.questionPaper);


    return (
        <tr>
            <td><input type="number" value={questionPaperDetails.year} onInput={(e) => setQuestionPaperDetails("year", parseInt(e.target.value))} readonly={!props.isEditMode}/></td>
            <td><input type="string" value={questionPaperDetails.course_code} onInput={(e) => setQuestionPaperDetails("course_code", e.target.value)} readonly={!props.isEditMode}/></td>
            <td><input type="string" value={questionPaperDetails.course_name} onInput={(e) => setQuestionPaperDetails("course_name", e.target.value)} readonly={!props.isEditMode}/></td>
            <td><input type="string" value={questionPaperDetails.exam} onInput={(e) => setQuestionPaperDetails("exam", e.target.value)} readonly={!props.isEditMode}/></td>
            <td><input type="string" value={questionPaperDetails.semester} onInput={(e) => setQuestionPaperDetails("semester", e.target.value)} readonly={!props.isEditMode}/></td>
            <td><input type="string" value={questionPaperDetails.approval} onInput={(e) => setQuestionPaperDetails("approval", e.target.value)} readonly={!props.isEditMode}/></td>
            <td><PDFIcon/><a href={props.questionPaper.filelink} target="_blank">{questionPaperDetails.course_code}.pdf</a></td>
        </tr>
    )
}
