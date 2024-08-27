export type Exam = "midsem" | "endsem";
export type Semester = "spring" | "autumn";

export interface IQuestionPaper {
    course_code: string;
    course_name: string;
    year: number;
    semester: Semester;
    exam: Exam | "unknown";
};

export interface ISearchResult extends IQuestionPaper {
    id: number;
    filelink: string;
    from_library: boolean;
};

export interface IAdminDashboardQP extends ISearchResult {
    approve_status: boolean;
    course_details?: string;
    upload_timestamp?: string;
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

interface IUploadResult {
    filename: string;
    status: string;
    description: string;
};

export type UploadResults = IUploadResult[];