import { IAdminDashboardQP, IQuestionPaper, ISearchResult } from "../types/types";

const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL;

type AllowedBackendMethods = "get" | "post";

async function makeBackendRequest(
	endpoint: string,
	method: AllowedBackendMethods,
	jwt: string | null,
	body: Object | null,
): Promise<Response> {
	const headers: {
		"Content-Type"?: string;
		Authorization?: string;
	} = new Object();

	if (jwt !== null) headers["Authorization"] = `Bearer ${jwt}`;
	if (body !== null) headers["Content-Type"] = "application/json";

	switch (method) {
		case "get":
			return await fetch(`${BACKEND_URL}/${endpoint}`, {
				method: "get",
				headers,
			});
		case "post":
			return await fetch(`${BACKEND_URL}/${endpoint}`, {
				method,
				headers,
				body: JSON.stringify(body ?? {}),
			});
	}
}

interface IOkResponse<T> {
	is_ok: true;
	status_code: 200;
	response: T;
}

interface IErrorResponse {
	is_ok: false;
	status_code: number;
	response: IHTTPMessage;
}

type BackendResponse<T> = IOkResponse<T> | IErrorResponse;

export interface IHTTPMessage {
	status_code: number;
	message: string;
}

export interface IEndpointTypes {
	[route: `search?${string}`]: {
		request: null,
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
	}
}

export async function makeRequest<E extends keyof IEndpointTypes>(
	endpoint: E,
	method: AllowedBackendMethods,
	params: IEndpointTypes[E]["request"] | null = null,
	jwt: string | null = null,
): Promise<BackendResponse<IEndpointTypes[E]["response"]>> {
	const response = await makeBackendRequest(endpoint, method, jwt, params);

	try {
		if (response.ok) {
			return {
				is_ok: true,
				status_code: 200,
				response: await response.json(),
			};
		}

		return {
			is_ok: false,
			status_code: response.status,
			response: {
				status_code: response.status,
				message: await response.text()
			},
		};
	} catch (e) {
		return {
			is_ok: false,
			status_code: response.status,
			response: {
				status_code: response.status,
				message: "An unexpected error occurred.",
			},
		};
	}
}