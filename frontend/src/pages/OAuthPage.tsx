import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../utils/auth";
import { makeRequest } from "../utils/backend";
import { useEffect, useState } from "react";
import { Header } from "../components/Common/Common";

export default function OAuthPage() {
	const auth = useAuthContext();
	const navigate = useNavigate();
	const [message, setMessage] = useState<string>("Authenticating, please wait...");

	const loginHandler = async (code: string) => {
		const response = await makeRequest('oauth', 'post', { code });

		if (response.status === 'success') {
			if ("token" in response.data) {
				auth.login(response.data["token"]);
				navigate('/admin');
			}
			else {
				setMessage("Authentication failed.");
			}
		} else {
			setMessage("Authentication failed due to a server error. Please try again later.");
		}
	}

	useEffect(() => {
		if (auth.isAuthenticated) {
			navigate('/admin');
		} else {
			const urlParams = new URLSearchParams(location.search);

			if (urlParams.get("code") === null) {
				setMessage("No OAuth code found. Redirecting to home page in 5s.");
				setTimeout(() => navigate("/"), 5000);
			} else {
				loginHandler(urlParams.get("code") as string);
			}
		}
	}, [])

	return (
		<Header
			title="Admin OAuth"
			subtitle={message}
		/>
	)
}