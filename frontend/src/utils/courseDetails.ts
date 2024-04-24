export const getCourseDetails = (filename: string) => {
    // filename format
    // course_code:year:mids/ends:summer/autumn
    const data = filename.split(":");

    // TODO: API call to get course name from course code

    const result = {
        course_code: data[0] || null,
        year: data[1] || null,
        exam: data[2] || null,
        semester: data[3] || null,
        course_name: "",
    };

    return result;
};
