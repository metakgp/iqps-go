import { Exam, IAdminDashboardQP, ISearchResult, Semester } from "./question_paper";

export type AllowedBackendMethods = "get" | "post";

export interface IOkResponse<T> {
	status: "success";
	messsage: string;
	status_code: 200;
	data: T;
}

export interface IErrorResponse {
	status: "error";
	message: string;
	status_code: number | string;
}

export type BackendResponse<T> = IOkResponse<T> | IErrorResponse;


export interface IEndpointTypes {
	search: {
		request: {
			course: string;
			exam: Exam | "";
		},
		response: ISearchResult[]
	},
	oauth: {
		request: {
			code: string
		},
		response: {
			token: string
		}
	},
	unapproved: {
		request: null,
		response: IAdminDashboardQP[]
	},
	upload: {
		request: FormData,
		response: {
			filename: string;
			status: string;
			description: string;
		}[]
	},
	approve: {
		request: IAdminDashboardQP,
		response: {
			id: number;
		}
	},
	delete: {
		request: {
			id: number;
		},
		response: null;
	},
	profile: {
		request: null;
		response: {
			username: string;
		}
	},
	similar: {
		request: {
			course_code: string;
			year?: number;
			semester?: Semester;
			exam?: Exam;
		},
		response: IAdminDashboardQP[];
	}
}