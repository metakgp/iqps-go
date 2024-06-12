import { Component, For } from "solid-js";
import courses from "../data/courses.json";
import { Select, createOptions } from "@thisbeyond/solid-select";
import "@thisbeyond/solid-select/style.css";
import "../styles/courseSelectMenu.scss";
import { IAdminQuestionPaperResult } from "../types/types";
import { Store } from "solid-js/store";
import { getCourseFromCode } from "../utils/autofillData";

type props = {
    qp: Store<IAdminQuestionPaperResult>;
    update: (course_code: string, value: string) => void;
    info: "course_code" | "course_name";
}

export const CoursesSelectMenu: Component<props> = (props) => {
    let course_info = createOptions(Object.keys(courses));
    if (props.info === "course_code") {
        course_info = createOptions(Object.keys(courses));
    } else if (props.info === "course_name") {
        course_info = createOptions(Object.values(courses));
    } 

    return (
        <Select 
            {...course_info} 
            class="select-course"  
            initialValue={props.qp[props.info]}
            onChange={(value) => {
                props.update(props.info, value);     
            }}
        />
    )
}