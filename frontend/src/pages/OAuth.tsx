import { Component, createSignal } from "solid-js";
import { useAuth } from "../components/AuthProvider";
import { useNavigate } from "@solidjs/router";

export const OAuthPage: Component = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const [message, setMessage] = createSignal<string>("Authenticating, please wait...");

    const loginHandler = async (code: string) => {
        const response = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/oauth`,
            {
                method: "POST",
                body: JSON.stringify({
                    code
                })
            }
        );

        if (response.ok) {
            const body = await response.json();

            if ("token" in body) {
                auth.logIn(body["token"]);
                navigate('/admin');
            }
            else {
                setMessage("Authentication failed.");
            }
        } else {
            setMessage("Authentication failed due to a server error. Please try again later.");
        }
    }

    if (auth.isAuthenticated()) {
        navigate('/admin');
    } else {
        const urlParams = new URLSearchParams(location.search);

        if (urlParams.get("code") === null) {
            setMessage("No OAuth code found. Redirecting to home page.");
            navigate("/");
        } else {
            loginHandler(urlParams.get("code") as string);
        }
    }

	return (
		<div class="oauth-page">
            <div class="title">
                <h1>IQPS - Admin Dashboard</h1>
                <p>
                    <i>{message()}</i>
                </p>
            </div>
		</div>
	)
}