import { Component, createSignal, For } from "solid-js";
import { IAdminQuestionPaperResult } from "../types/types";
import { ListElement } from "./PDFLister";

type props =  {
    QuestionPapers: IAdminQuestionPaperResult[];
}



export const PDFLister: Component<props> = (props) => {
    let [reviewList, setReviewList] = createSignal<IAdminQuestionPaperResult[]>(props.QuestionPapers);

    setReviewList(props.QuestionPapers)

    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th>Year</th>
                        <th>Code</th>
                        <th>Course Name</th>
                        <th>Exam</th>
                        <th>Semester</th>
                        <th>Approval</th>
                        <th>File</th>
                    </tr>
                </thead>
                
                <For each={reviewList()}>{(item) => (
                    <ListElement questionPaper={item} />
                )}
                </For>
            </table>
        </div>
    )
}