import { IAdminQuestionPaperResult } from "../types/types";
import { getCourseFromCode } from "../utils/autofillData";
import COURSE_CODE_MAP from "./courses.json"

const dataElements = 50;

let files = ["./dummyPDFs/sample1.pdf", "./dummyPDFs/sample2.pdf", "./dummyPDFs/sample3.pdf", "./dummyPDFs/sample4.pdf", "./dummyPDFs/sample5.pdf"]

const courses = Object.keys(COURSE_CODE_MAP);

export let arr: IAdminQuestionPaperResult[] = [];

for ( let i: number = 0; i < dataElements; i++){
    let courseIndex = Math.floor(Math.random() * courses.length);
    let qp: IAdminQuestionPaperResult = {
        course_code: courses[courseIndex],
        course_name: getCourseFromCode(courses[courseIndex])!,
        id: i,
        year: new Date().getFullYear() - (1 + Math.floor(Math.random() * 4)),
        semester: Math.floor(Math.random() * 2) ? "spring" : "autumn",
        exam: Math.floor(Math.random() * 2) ? "midsem" : "endsem",
        approval: false,
        reviewedBy: null,
        file_link: files[Math.floor(Math.random() * 5)],
    };
    arr.push(qp);
}
