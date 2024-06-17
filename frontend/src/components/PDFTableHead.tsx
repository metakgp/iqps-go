import { Component, For, createSignal } from "solid-js";
import { IAdminQuestionPaperResult } from "../types/types";
import { ListElement } from "./PDFTableBody";
import { createStore } from "solid-js/store";

type props =  {
    QuestionPapers: IAdminQuestionPaperResult[];
}

export const PDFLister: Component<props> = (props) => {
    const [reviewList, setReviewList] = createStore<IAdminQuestionPaperResult[]>(props.QuestionPapers);

    const columns = [
        {label: "Code", accessor: "course_code"},
        {label: "Course Name", accessor: "course_name"},
        {label: "Year", accessor: "year"},
        {label: "Exam", accessor: "exam"},
        {label: "Semester", accessor: "semester"},
        {label: "FIle", accessor: "file_link"},
        {label: "Approval", accessor: "approval"}
    ]

    const [sortField, setSortField] = createSignal<string>("");
    const [order, setOrder] = createSignal<"asc" | "desc">("asc");

    const handleSorting = (sortField: string, sortOrder: "asc" | "desc") => {
      if (sortField) {
          const sorted = [...reviewList].sort((a, b) => {
            return (
              a[sortField].toString().localeCompare(b[sortField].toString(), "en", {
                numeric: true,
              }) * (sortOrder === "asc" ? 1 : -1)
            );
          });
          setReviewList(sorted);
      }
     }

    const handleSortingChange = (accessor) => {
        const sortOrder: "asc" | "desc" = ((accessor === sortField()) && (order() === "asc") ? "desc" : "asc");
        setSortField(accessor);
        setOrder(sortOrder);
        handleSorting(accessor, sortOrder);
    }
    
    return (
        <div>
            <table class="qp-table">
            <caption><em>Approval status of all submited question papers</em></caption>
                <thead>
                    <tr class="qp-table-row">
                        <For each={columns}>{(column) => {
                            return (
                                <th id={column.accessor} onClick={() => handleSortingChange(column.accessor)}>{column.label}</th>
                            )
                        }}</For>
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