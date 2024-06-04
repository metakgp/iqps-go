import { Component, createSignal, For } from "solid-js";
import { IAdminQuestionPaperResult } from "../types/types";
import { ListElement } from "./PDFLister";
import { IoPencil } from "solid-icons/io";
import { createShortcut } from "@solid-primitives/keyboard";
import { createStore } from "solid-js/store";

type props =  {
    QuestionPapers: IAdminQuestionPaperResult[];
}

export const PDFLister: Component<props> = (props) => {
    const [reviewList, setReviewList] = createStore<IAdminQuestionPaperResult[]>(props.QuestionPapers);
    const [isEditMode, setIsEditMode] = createSignal<boolean>(true)

    function toggleEditMode(){
        setIsEditMode(!isEditMode());
    }
    
    createShortcut(
        ["Alt", "Z"],
        () => {
            toggleEditMode();
        },
        { preventDefault: true},
    );

    return (
        <div>
            <span><button onclick={toggleEditMode}><IoPencil/></button> is editable = {isEditMode().toString()}</span>
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
                
                <For each={reviewList}>{(item) => (
                    <ListElement questionPaper={item} isEditMode={isEditMode()}/>
                )}
                </For>
            </table>
        </div>
    )
}