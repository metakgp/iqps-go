import courses from "../data/courses.json";

type Courses = {
    [key: string]: string;
};

export const autofillData = (
    filename: string
): {
    course_code: string;
    course_name: string;
    year: string;
    semester: "spring" | "autumn";
    exam: "midsem" | "endsem";
} => {
    const coursesData: Courses = courses;

    const dotIndex = filename.lastIndexOf(".");
    const filenameparts = filename.substring(0, dotIndex).split("_");

    let [course_code, year, exam, semester] = filenameparts;

    if (
        !year ||
        year.length !== 4 ||
        isNaN(parseInt(year)) ||
        parseInt(year) > new Date().getFullYear()
    )
        year = new Date().getFullYear().toString();

    if (!exam || (exam !== "midsem" && exam !== "endsem")) exam = "midsem";

    if (!semester || (semester !== "spring" && semester !== "autumn"))
        semester = new Date().getMonth() > 7 ? "autumn" : "spring";

    return {
        course_code,
        year,
        exam: exam as "midsem" | "endsem",
        semester: semester as "spring" | "autumn",
        course_name: coursesData[course_code],
    };
};
