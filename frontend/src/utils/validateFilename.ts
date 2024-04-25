import courses from "../data/courses.json";

type Courses = {
    [key: string]: string;
};

export const validateFilename = (filename: string) => {
    const coursesData: Courses = courses;

    const dotIndex = filename.lastIndexOf(".");
    const filenameparts = filename.substring(0, dotIndex).split("_");

    if (filenameparts.length !== 4) return null;

    const [course_code, year, exam, semester] = filenameparts;

    if (course_code.length !== 7 || !coursesData.hasOwnProperty(course_code))
        return null;

    if (
        year.length !== 4 ||
        isNaN(parseInt(year)) ||
        parseInt(year) > new Date().getFullYear()
    )
        return null;

    if (exam !== "midsem" && exam !== "endsem") return null;

    if (semester !== "spring" && semester !== "autumn") return null;

    return {
        course_code,
        year,
        exam,
        semester,
        course_name: coursesData[course_code],
    };
};
