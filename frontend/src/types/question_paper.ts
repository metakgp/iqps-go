/**
 * - If the paper is a major examination, `midsem` or `endsem` is to be used.
 * - For class tests, the format `ctx` where x is the number of the class test should be used.
 */
export type Exam = "midsem" | "endsem" | `ct${number}`;
export type Semester = "spring" | "autumn";

export interface IQuestionPaper {
    course_code: string;
    course_name: string;
    year: number;
    semester: Semester;
    exam: Exam | "ct" | "";
};

export interface ISearchResult extends IQuestionPaper {
    id: number;
    filelink: string;
    from_library: boolean;
};

export interface IAdminDashboardQP extends ISearchResult {
    upload_timestamp: string;
    approve_status: boolean;
}

export interface IQuestionPaperFile extends IQuestionPaper {
    file: File;
};

export interface IErrorMessage {
    courseCodeErr: string | null;
    courseNameErr: string | null;
    yearErr: string | null;
    examErr: string | null;
    semesterErr: string | null;
};