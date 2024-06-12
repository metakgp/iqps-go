import { Component, For } from "solid-js";
import courses from "../data/courses.json";
import { Select, createOptions } from "@thisbeyond/solid-select";
import "@thisbeyond/solid-select/style.css";
import "../styles/courseSelectMenu.scss";
import { IAdminQuestionPaperResult } from "../types/types";
import { Store } from "solid-js/store";

type props = {
    qp: Store<IAdminQuestionPaperResult>;
    update: (course_code: string, value: string) => void;
}

export const CoursesSelectMenu: Component<props> = (props) => {
    const course_codes = createOptions(Object.keys(courses));

    return (
        <Select 
            {...course_codes} 
            class="select-course"  
            initialValue={props.qp.course_code}
            onChange={(value) => {props.update("course_code", value)}}
        />
    )
}