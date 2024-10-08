import { AllowedBackendMethods, BackendResponse, IEndpointTypes } from "../types/backend";

export const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL;

interface IBodyTypes {
	get: Object;
	post: Object | FormData;
}

async function makeBackendRequest<M extends AllowedBackendMethods>(
	endpoint: string,
	method: M,
	jwt: string | null,
	body: IBodyTypes[M] | null
): Promise<Response> {
	const headers: {
		"Content-Type"?: string;
		Authorization?: string;
	} = new Object();

	if (jwt !== null) headers["Authorization"] = `Bearer ${jwt}`;
	if (
		!(
			body == null ||
			body instanceof FormData
		)
	) headers["Content-Type"] = "application/json";

	switch (method) {
		case "get":
			const requestURL = new URL(`${BACKEND_URL}/${endpoint}`);
			if (body !== null) {
				Object.entries(body).map(([key, value]) => requestURL.searchParams.set(key, value));
			}

			return await fetch(requestURL, {
				method: "get",
				headers,
			});
		case "post":
			return await fetch(`${BACKEND_URL}/${endpoint}`, {
				method,
				headers,
				body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
			});
		default:
			throw 'This should not happen';
	}
}

export async function makeRequest<E extends keyof IEndpointTypes>(
	endpoint: E,
	method: AllowedBackendMethods,
	params: IEndpointTypes[E]["request"] | null = null,
	jwt: string | null = null,
): Promise<BackendResponse<IEndpointTypes[E]["response"]>> {
	try {
		const response = await makeBackendRequest(endpoint, method, jwt, params);

		try {
			return {
				...await response.json(),
				status_code: response.status
			}
		} catch (e) {
			return {
				status: "error",
				status_code: response.status,
				message: await response.text()
			};
		}
	} catch (e) {
		return {
			status: "error",
			status_code: 'Over 9000',
			message: `An unexpected error occurred: ${e}`
		}
	}
}

export function formatBackendTimestamp(timestamp: string): string {
	const date = new Date(timestamp);

	return date.toLocaleString('default', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		minute: '2-digit',
		hour: '2-digit',
		hour12: true,
		hourCycle: 'h12'
	});
}