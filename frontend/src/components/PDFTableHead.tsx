import { Component, For, createSignal } from "solid-js";
import { IAdminDashboardQP } from "../types/types";
import { ListElement } from "./PDFTableBody";
import { createStore } from "solid-js/store";

type props =  {
    QuestionPapers: IAdminDashboardQP[];
}

export const PDFLister: Component<props> = (props) => {
    const [reviewList, setReviewList] = createStore<IAdminDashboardQP[]>(props.QuestionPapers);

    const columns: {
        label: string;
        accessor: keyof IAdminDashboardQP
    }[] = [
        {label: "Code", accessor: "course_code"},
        {label: "Course Name", accessor: "course_name"},
        {label: "Year", accessor: "year"},
        {label: "Exam", accessor: "exam"},
        {label: "Semester", accessor: "semester"},
        {label: "File", accessor: "filelink"},
        {label: "Approval", accessor: "approve_status"}
    ]

    const [sortField, setSortField] = createSignal<keyof IAdminDashboardQP>("course_name");
    const [order, setOrder] = createSignal<"asc" | "desc">("asc");

    const handleSorting = (sortField: keyof IAdminDashboardQP, sortOrder: "asc" | "desc") => {
      if (sortField) {
          const sorted = [...reviewList].sort((a, b) => {
            return (
              a[sortField]!.toString().localeCompare(b[sortField]!.toString(), "en", {
                numeric: true,
              }) * (sortOrder === "asc" ? 1 : -1)
            );
          });
          setReviewList(sorted);
      }
     }

    const handleSortingChange = (accessor: keyof IAdminDashboardQP) => {
        const sortOrder: "asc" | "desc" = ((accessor === sortField()) && (order() === "asc") ? "desc" : "asc");
        setSortField(accessor);
        setOrder(sortOrder);
        handleSorting(accessor, sortOrder);
    }

    return (
        <div class="pdf-lister">
            <table class="qp-table">
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