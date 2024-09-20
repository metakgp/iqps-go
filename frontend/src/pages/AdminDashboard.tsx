import { useEffect, useState } from "react";
import { OAUTH_LOGIN_URL, useAuthContext } from "../utils/auth";
import { makeRequest } from "../utils/backend";
import { IAdminDashboardQP } from "../types/question_paper";
import { Header } from "../components/Common/Common";

import "./styles/admin_dashboard.scss";
import { QPCard } from "../components/AdminDashboard/QPCard";

function AdminDashboard() {
	const auth = useAuthContext();
	const [unapprovedPapers, setUnapprovedPapers] = useState<IAdminDashboardQP[]>([]);

	const fetchUnapprovedPapers = async () => {
		const papers = await makeRequest('unapproved', 'get', null, auth.jwt);

		if (papers.status === 'success') {
			setUnapprovedPapers(papers.data);
		}
	};

	useEffect(() => {
		if (!auth.isAuthenticated) {
			window.location.assign(OAUTH_LOGIN_URL);
		} else {
			fetchUnapprovedPapers();
		}
	}, []);

	return auth.isAuthenticated ? <div id="admin-dashboard">
		<Header
			title="Admin Dashboard"
			subtitle="Top secret documents - to be approved inside n-sided polygon shaped buildings only."
		/>

		<div className="dashboard-container">
			<p><b>Unapproved papers</b>: {unapprovedPapers.length}</p>
			<div className="unapproved-table">
				{unapprovedPapers.map((paper, i) => <QPCard qPaper={paper} key={i} />)}
			</div>
		</div>
	</div> : <p>You are unauthenticated. This incident will be reported.</p>;
}

export default AdminDashboard;