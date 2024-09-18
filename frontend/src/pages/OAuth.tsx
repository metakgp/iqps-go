import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../utils/auth";
import { makeRequest } from "../utils/backend";
import { useState } from "react";

export const OAuthPage = () => {
    const auth = useAuthContext();
    const navigate = useNavigate();
    const [message, setMessage] = useState<string>("Authenticating, please wait...");

    const loginHandler = async (code: string) => {
        const response = await makeRequest('oauth', 'post', {code});

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

	return (
		<div className="oauth-page">
            <div className="title">
                <h1>IQPS - Admin Dashboard</h1>
                <p>
                    <i>{message}</i>
                </p>
            </div>
		</div>
	)
}