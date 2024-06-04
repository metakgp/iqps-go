import { IAdminQuestionPaperResult } from "../types/types";
import { getCourseFromCode } from "../utils/autofillData";


let files = ["./dummyPDFs/sample1.pdf", "./dummyPDFs/sample2.pdf", "./dummyPDFs/sample3.pdf", "./dummyPDFs/sample4.pdf", "./dummyPDFs/sample5.pdf"]

const courses = ["AR52001",
"EP61201",
"IP69108",
"PH31207",
"MM61313",
"AR40211",
"BT29204",
"CS30202",
"GG40231",
"MA41201",
"MM50007",
"PE69003",
"RE69004",
"EE69401",
"GG21202",
"GG48201",
"GG59022",
"MM40003",
"NA69202",
"AR29202",
"CE69008",
"GG30201",
"HS20202",
"IP60109",
"ME60030",
"AE21204",
"BS57002",
"CH29201",
"CS29203",
"GG20208",
"HS30207",
"NA61005"]

export let arr: IAdminQuestionPaperResult[] = [];

for ( let i: number = 0; i < 100; i++){
    let courseIndex = Math.floor(Math.random() * courses.length);
    let qp: IAdminQuestionPaperResult = {
        course_code: courses[courseIndex],
        course_name: getCourseFromCode(courses[courseIndex])!,
        id: i,
        year: new Date().getFullYear() - (1 + Math.floor(Math.random() * 4)),
        semester: Math.floor(Math.random() * 2) ? "spring" : "autumn",
        exam: Math.floor(Math.random() * 2) ? "midsem" : "endsem",
        approval: "pending",
        reviewedBy: null,
        filelink: files[Math.floor(Math.random() * 5)],
    };
    arr.push(qp);
}
