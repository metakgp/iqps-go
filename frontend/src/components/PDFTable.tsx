import { Component, For } from "solid-js";
import { IAdminQuestionPaperResult } from "../types/types";
import { ListElement } from "./PDFLister";
import { createStore } from "solid-js/store";

type props =  {
    QuestionPapers: IAdminQuestionPaperResult[];
}

export const PDFLister: Component<props> = (props) => {
    const [reviewList, setReviewList] = createStore<IAdminQuestionPaperResult[]>(props.QuestionPapers);
    
    return (
        <div>
            <table class="qp-table">
            <caption><em>Approval status of all submited question papers</em></caption>
                <thead>
                    <tr class="qp-table-row">
                        <th>Code</th>
                        <th>Course Name</th>
                        <th>Year</th>
                        <th>Exam</th>
                        <th>Semester</th>
                        <th>File</th>
                        <th>Approval</th>
                    </tr>
                </thead>
                <tbody>
                     <For each={reviewList}>{(item) => (
                         <ListElement questionPaper={item} />
                     )}
                     </For>
                </tbody>
            </table>
        </div>
    )
}