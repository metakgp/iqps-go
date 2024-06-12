import { AiFillCloseCircle, AiFillWarning, AiOutlineFilePdf as PDFIcon } from "solid-icons/ai";
import { Component } from "solid-js";
import { createStore } from "solid-js/store";
import { IAdminQuestionPaperResult, approvalStatus } from "../types/types";
import { IoCheckmarkCircle } from "solid-icons/io";
import { CoursesSelectMenu } from "./CoursesSelectMenu";
import { Select, createOptions } from "@thisbeyond/solid-select";
import "@thisbeyond/solid-select/style.css";
import "../styles/courseSelectMenu.scss";

type props = {
    questionPaper: IAdminQuestionPaperResult;
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

    return (
        <tr>
            <td><CoursesSelectMenu 
                qp={props.questionPaper} 
                update={setQuestionPaperDetails}
                info="course_code"
                />
            </td>
            <td><CoursesSelectMenu 
                qp={props.questionPaper}
                update={setQuestionPaperDetails}
                info="course_name"
                />
            </td>
            <td><Select
                class="select" 
                // returns every year since 1951 till today as options for year dropdown
                {...createOptions([...Array.from({length: new Date().getFullYear() - 1950}, (e, i) => (new Date().getFullYear() - i).toString())])}
                initialValue={questionPaperDetails.year}
                onChange={(value) => {
                    setQuestionPaperDetails(value);
                }}
                />
            </td>
            <td><Select
                class="select"
                {...createOptions(["endsem", "midsem"])}
                initialValue={questionPaperDetails.exam}
                onChange={(value) => {
                    setQuestionPaperDetails("exam", value)
                }}
                />
            </td>
            <td><Select
                class="select"
                {...createOptions(["autumn", "spring"])}
                initialValue={questionPaperDetails.semester}
                onChange={(value) => {
                    setQuestionPaperDetails("semester", value)
                }}
                />
            </td>
            <td><PDFIcon/><a href={props.questionPaper.filelink} target="_blank">{questionPaperDetails.course_code}.pdf</a></td>
            <td><button onClick={(e) => {e.preventDefault();paperApprove(questionPaperDetails.approval)}} onContextMenu={(e) => {e.preventDefault();paperReject(questionPaperDetails.approval)}}>{approvalStatus(questionPaperDetails.approval)} </button></td>
        </tr>
    )
}
