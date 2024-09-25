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
import toast from "react-hot-toast";

function AdminDashboard() {
	const auth = useAuthContext();
	const [unapprovedPapers, setUnapprovedPapers] = useState<IAdminDashboardQP[]>([]);
	const [numUniqueCourseCodes, setNumUniqueCourseCodes] = useState<number>(0);
	const [awaitingResponse, setAwaitingResponse] = useState<boolean>(false);

	const [selectedQPaper, setSelectedQPaper] =
		useState<IAdminDashboardQP | null>(null);

	const handlePaperEdit = async (qp: IAdminDashboardQP) => {
		// Only approves the paper rn
		// TODO: Allow unapproving papers as well

		const response = await makeRequest('approve', 'post', {
			...qp,
			filelink: new URL(qp.filelink).pathname, // TODO: PLEASE DO THIS IN THE BAKCEND AHHHH ITS CALLED FILELINK NOT FILEPATH DED
			year: qp.year.toString()
		}, auth.jwt);
		console.log(response);

		if (response.status === "success") {
			toast.success(response.data.message);
		} else {
			toast.error(`Approve error: ${response.message} (${response.status_code})`);
		}
	}

	const fetchUnapprovedPapers = async () => {
		setAwaitingResponse(true);
		// TODO: Show all uploaded papers or only unapproved based on user toggle
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
								onDelete={() => {
									console.log('deleted paper')
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
				updateQPaper={(qp) => handlePaperEdit(qp)}
			/>
		)}
	</div> : <p>You are unauthenticated. This incident will be reported.</p>;
}

export default AdminDashboard;