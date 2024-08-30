import { AiFillCloseCircle } from "solid-icons/ai";
import { FaSolidFilePdf as PDFIcon } from "solid-icons/fa";
import COURSE_CODE_MAP from "../data/courses.json";
import { Component } from "solid-js";
import { createStore } from "solid-js/store";
import { IAdminDashboardQP } from "../types/question_paper";
import { IoCheckmarkCircle } from "solid-icons/io";
import { Select, createOptions } from "@thisbeyond/solid-select";
import { fileNamer } from "../utils/fileNamer";
import { getCodeFromCourse, getCourseFromCode } from "../utils/autofillData";

type props = {
    questionPaper: IAdminDashboardQP;
}

export const ListElement: Component<props> = (props) => {
    const [questionPaperDetails, setQuestionPaperDetails] = createStore<IAdminDashboardQP>(props.questionPaper);

    function toggleApproval(approvalStatus: boolean) {
        let confirmed = confirm(`Are you sure you want to ${approvalStatus ? 'DISAPPROVE' : 'APPROVE'} this paper?`);
        if (confirmed) setQuestionPaperDetails("approve_status", !approvalStatus);
    };

    function whichButton (approvalStatus: boolean) {
        if (approvalStatus) {
            return (
                <><IoCheckmarkCircle size="1.4rem"/> Approved</>
            )
        } else {
            return (
                <><AiFillCloseCircle  size="1.4rem"/> Not Approved</>
            )
        }
    }

    return (
        <tr classList={{["qp-table-tr-pending"]: questionPaperDetails.approve_status === null ? true : false, ["qp-table-tr-approve"]: questionPaperDetails.approve_status === true, ["qp-table-tr-reject"]: questionPaperDetails.approve_status === false}}>
            <td><Select
                disabled={questionPaperDetails.approve_status}
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
                disabled={questionPaperDetails.approve_status}
                class="select"
                {...createOptions(Object.values(COURSE_CODE_MAP))}
                initialValue={questionPaperDetails.course_name}
                onChange={(value: string) => {
                    setQuestionPaperDetails("course_name", value);
                    setQuestionPaperDetails("course_code", getCodeFromCourse(value) ?? "Unknown Course");
                }}
                />
            </td>
            <td><Select
                disabled={questionPaperDetails.approve_status}
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
                disabled={questionPaperDetails.approve_status}
                class="select"
                {...createOptions(["endsem", "midsem"])}
                initialValue={questionPaperDetails.exam}
                onChange={(value) => {
                    setQuestionPaperDetails("exam", value)
                }}
                />
            </td>
            <td><Select
                disabled={questionPaperDetails.approve_status}
                class="select"
                {...createOptions(["autumn", "spring"])}
                initialValue={questionPaperDetails.semester}
                onChange={(value) => {
                    setQuestionPaperDetails("semester", value)
                }}
                />
            </td>
            <td>
                <a href={props.questionPaper.filelink} target="_blank" class="pdf-link">
                    <PDFIcon size="1.4rem" />
                    {fileNamer(questionPaperDetails)}
                </a>
            </td>
            <td>
                <button
                    classList={{
                        ["approve-button"]: questionPaperDetails.approve_status,
                        ["reject-button"]: !questionPaperDetails.approve_status
                    }}
                    onClick={() => {
                        toggleApproval(questionPaperDetails.approve_status);
                    }}
                >{whichButton(questionPaperDetails.approve_status)}</button>
            </td>
        </tr>
    )
}
