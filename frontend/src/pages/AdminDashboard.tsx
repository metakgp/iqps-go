import { useEffect, useState } from "react";
import { OAUTH_LOGIN_URL, useAuthContext } from "../utils/auth";
import { makeRequest } from "../utils/backend";
import { IAdminDashboardQP } from "../types/question_paper";
import { Header } from "../components/Common/Common";

import "./styles/admin_dashboard.scss";
import { QPCard } from "../components/AdminDashboard/QPCard";
import { MdLogout } from "react-icons/md";
import PaperEditModal from "../components/Common/PaperEditModal";
import Spinner from "../components/Spinner/Spinner";

function AdminDashboard() {
	const auth = useAuthContext();
	const [unapprovedPapers, setUnapprovedPapers] = useState<IAdminDashboardQP[]>([]);
	const [numUniqueCourseCodes, setNumUniqueCourseCodes] = useState<number>(0);
	const [awaitingResponse, setAwaitingResponse] = useState<boolean>(false);

	const [selectedQPaper, setSelectedQPaper] =
		useState<IAdminDashboardQP | null>(null);

	const fetchUnapprovedPapers = async () => {
		setAwaitingResponse(true);
		const papers = await makeRequest('unapproved', 'get', null, auth.jwt);

		if (papers.status === 'success') {
			setUnapprovedPapers(papers.data);
			setNumUniqueCourseCodes(
				// Make an array of course codes
				papers.data.map((paper) => paper.course_code)
					.filter(
						// Keep unqiue values
						(code, i, arr) => arr.indexOf(code) === i
					).length
			)
		}

		setAwaitingResponse(false);
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
			link={{
				onClick: (e) => {
					e.preventDefault();
					auth.logout();
				},
				text: "Want to destroy the paper trail?",
				button_text: "Logout",
				icon: MdLogout
			}}
		/>

		<div className="dashboard-container">
			{
				awaitingResponse ? <Spinner /> :
					<>
						<div className="side-panel">
							<p><b>Unapproved papers</b>: {unapprovedPapers.length}</p>
							<p><b>Unique Course Codes</b>: {numUniqueCourseCodes}</p>
						</div>
						<div className="papers-panel">
							{unapprovedPapers.map((paper, i) => <QPCard
								onEdit={(e) => {
									e.preventDefault();
									setSelectedQPaper(paper);
								}}
								qPaper={paper}
								key={i}
							/>
							)}
						</div>
					</>
			}
		</div>

		{selectedQPaper !== null && (
			<PaperEditModal
				onClose={() => setSelectedQPaper(null)}
				qPaper={selectedQPaper}
				updateQPaper={() => { }}
			/>
		)}
	</div> : <p>You are unauthenticated. This incident will be reported.</p>;
}

export default AdminDashboard;