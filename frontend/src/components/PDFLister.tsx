import { AiFillCloseCircle, AiFillWarning, AiOutlineFilePdf as PDFIcon } from "solid-icons/ai";
import { Component, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { Exam, IAdminQuestionPaperResult, Semester, approvalStatus } from "../types/types";
import { IoCheckmarkCircle } from "solid-icons/io";
import { createShortcut } from "@solid-primitives/keyboard";

type props = {
    questionPaper: IAdminQuestionPaperResult;
    isEditMode: boolean;
}

export const ListElement: Component<props> = (props) => {
    const [questionPaperDetails, setQuestionPaperDetails] = createStore<IAdminQuestionPaperResult>(props.questionPaper);

    function approvalStatus(approvalStatus: approvalStatus) {
        if (approvalStatus == null) {
            return (<AiFillWarning/>);
        } else if (approvalStatus) {
            return (<IoCheckmarkCircle/>);
        } else {
            return (<AiFillCloseCircle/>);
        }
    };

    function paperApprove(approvalStatus: approvalStatus){
        if (approvalStatus == null) {setQuestionPaperDetails("approval", true)}
        else {
            setQuestionPaperDetails("approval", null)
        }
    };

    function paperReject(approvalStatus: approvalStatus){
        if (approvalStatus == null) {setQuestionPaperDetails("approval", false)}
        else {
            setQuestionPaperDetails("approval", null)
        }
    }

    // createShortcut(
    //     ["Alt", "V"],
    //     () => {
    //         paperApprove(questionPaperDetails.approval);
    //     },
    //     { preventDefault: true},
    // )

    return (
        <tr>
            <td><input type="number" value={questionPaperDetails.year} onInput={(e) => setQuestionPaperDetails("year", parseInt(e.target.value))} readonly={!props.isEditMode}/></td>
            <td><input type="string" value={questionPaperDetails.course_code} onInput={(e) => setQuestionPaperDetails("course_code", e.target.value)} readonly={!props.isEditMode}/></td>
            <td><input type="string" value={questionPaperDetails.course_name} onInput={(e) => setQuestionPaperDetails("course_name", e.target.value)} readonly={!props.isEditMode}/></td>
            <td><input type="string" value={questionPaperDetails.exam} onInput={(e) => setQuestionPaperDetails("exam", e.target.value)} readonly={!props.isEditMode}/></td>
            <td><input type="string" value={questionPaperDetails.semester} onInput={(e) => setQuestionPaperDetails("semester", e.target.value)} readonly={!props.isEditMode}/></td>
            <td><PDFIcon/><a href={props.questionPaper.filelink} target="_blank">{questionPaperDetails.course_code}.pdf</a></td>
            <td><button onClick={(e) => {e.preventDefault();if (props.isEditMode) {paperApprove(questionPaperDetails.approval)}}} onContextMenu={(e) => {e.preventDefault();if (props.isEditMode){paperReject(questionPaperDetails.approval)}}}>{approvalStatus(questionPaperDetails.approval)} </button></td>
        </tr>
    )
}
