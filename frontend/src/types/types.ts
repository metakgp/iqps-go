export type SearchResult = {
    id: number;
    course_name: string;
    course_code: string;
    year: number;
    exam: string;
    filelink: string;
    from_library: boolean;
};

export type QuestionPaper = {
    file: File;
    course_code: string;
    course_name: string;
    year: string;
    semester: "spring" | "autumn";
    exam: "midsem" | "endsem";
};

export type ErrorMessage = {
    course_code: string;
    course_name: string;
    year: string;
    exam: string;
    semester: string;
};
