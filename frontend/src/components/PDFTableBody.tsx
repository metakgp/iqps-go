import { AiFillCloseCircle, AiOutlineFilePdf as PDFIcon } from "solid-icons/ai";
import COURSE_CODE_MAP from "../data/courses.json";
import { Component } from "solid-js";
import { createStore } from "solid-js/store";
import { IAdminQuestionPaperResult, approvalStatus } from "../types/types";
import { IoCheckmarkCircle } from "solid-icons/io";
import { Select, createOptions } from "@thisbeyond/solid-select";
import { fileNamer } from "../utils/fileNamer";
import { getCodefromCourse, getCourseFromCode } from "../utils/autofillData";

type props = {
    questionPaper: IAdminQuestionPaperResult;
}

export const ListElement: Component<props> = (props) => {
    const [questionPaperDetails, setQuestionPaperDetails] = createStore<IAdminQuestionPaperResult>(props.questionPaper);

    function paperApprove(approvalStatus: boolean){
        if (approvalStatus === false) {
            confirm("Are you sure you want to APPROVE this paper?");
            setQuestionPaperDetails("approval", true);
        }
    };

    function whichButton (approvalStatus: boolean) {
        if (approvalStatus) {
            return (
                <IoCheckmarkCircle/>
            )
        } else {
            return (
                <AiFillCloseCircle/>
            )
        }
    }

    return (
        <tr classList={{["qp-table-tr-pending"]: questionPaperDetails.approval === null ? true : false, ["qp-table-tr-approve"]: questionPaperDetails.approval === true, ["qp-table-tr-reject"]: questionPaperDetails.approval === false}}>
            <td><Select
                disabled={questionPaperDetails.approval}
                class="select"
                {...createOptions(Object.keys(COURSE_CODE_MAP))}
                initialValue={questionPaperDetails.course_code}
                onChange={(value) => {
                    setQuestionPaperDetails("course_code", value);
                    setQuestionPaperDetails("course_name", getCourseFromCode(value)!);
                }}
                />
            </td>
            <td><Select
                disabled={questionPaperDetails.approval}
                class="select"
                {...createOptions(Object.values(COURSE_CODE_MAP))}
                initialValue={questionPaperDetails.course_name}
                onChange={(value) => {
                    setQuestionPaperDetails("course_name", value);
                    setQuestionPaperDetails("course_code", getCodefromCourse(value));
                }}
                />
            </td>
            <td><Select
                disabled={questionPaperDetails.approval}
                class="select"
                // returns every year since 1951 till today as options for year dropdown
                {...createOptions([...Array.from({length: new Date().getFullYear() - 1950}, (e, i) => (new Date().getFullYear() - i).toString())])}
                initialValue={questionPaperDetails.year}
                onChange={(value) => {
                    setQuestionPaperDetails("year", value);
                }}
                />
            </td>
            <td><Select
                disabled={questionPaperDetails.approval}
                class="select"
                {...createOptions(["endsem", "midsem"])}
                initialValue={questionPaperDetails.exam}
                onChange={(value) => {
                    setQuestionPaperDetails("exam", value)
                }}
                />
            </td>
            <td><Select
                disabled={questionPaperDetails.approval}
                class="select"
                {...createOptions(["autumn", "spring"])}
                initialValue={questionPaperDetails.semester}
                onChange={(value) => {
                    setQuestionPaperDetails("semester", value)
                }}
                />
            </td>
            <td>
                <div class="pdf-link">
                    <PDFIcon size={30} />
                    <a href={props.questionPaper.file_link} target="_blank">{fileNamer(questionPaperDetails)}</a>
                </div>
            </td>
            <td>
                <button
                disabled={questionPaperDetails.approval}
                classList={{["approve-button"]: questionPaperDetails.approval, ["reject-button"]: !questionPaperDetails.approval}}
                    onClick={() => {
                        paperApprove(questionPaperDetails.approval);
                    }}
                >{whichButton(questionPaperDetails.approval)}</button>
            </td>
        </tr>
    )
}
