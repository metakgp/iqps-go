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
            <table>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Course Name</th>
                        <th>Year</th>
                        <th>Exam</th>
                        <th>Semester</th>
                        <th>File</th>
                        <th>Approval</th>
                    </tr>
                </thead>
                
                <For each={reviewList}>{(item) => (
                    <ListElement questionPaper={item} />
                )}
                </For>
            </table>
        </div>
    )
}