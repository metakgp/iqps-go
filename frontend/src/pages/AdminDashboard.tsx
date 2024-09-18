import { useEffect } from "react";
import { OAUTH_LOGIN_URL, useAuthContext } from "../utils/auth";

function AdminDashboard() {
	const auth = useAuthContext();

	useEffect(() => {
		if (!auth.isAuthenticated) {
			window.location.assign(OAUTH_LOGIN_URL);
		}
	}, [])

	return <></>;
}

export default AdminDashboard;