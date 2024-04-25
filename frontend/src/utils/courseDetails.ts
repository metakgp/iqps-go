import courses from "../data/courses.json";

type Courses = {
    [key: string]: string;
};

export const getCourseDetails = (filename: string) => {
    // filename format
    // course_code_year_midsem/endsem_summer/autumn.pdf

    const dotIndex = filename.lastIndexOf('.');
    const [course_code, year, exam, semester] = filename.substring(0, dotIndex).split("_");

    const coursesData: Courses = courses;

    const result = {
        course_code: course_code || null,
        year: year || null,
        exam: exam || null,
        semester: semester.split(".")[0] || null,
        course_name: coursesData[course_code] || null,
    };

    return result;
};
