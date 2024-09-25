export type Exam = "midsem" | "endsem";
export type Semester = "spring" | "autumn";

export interface IQuestionPaper<Y = number> {
    course_code: string;
    course_name: string;
    year: Y;
    semester: Semester;
    exam: Exam | "unknown";
};

export interface ISearchResult<Y = number> extends IQuestionPaper<Y> {
    id: string;
    filelink: string;
    from_library: boolean;
};

export interface IAdminDashboardQP<Y = number> extends ISearchResult<Y> {
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