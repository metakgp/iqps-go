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
import { extractDetailsFromText, extractTextFromPDF, IExtractedDetails } from "../utils/autofillData";

function AdminDashboard() {
	const auth = useAuthContext();
	const [unapprovedPapers, setUnapprovedPapers] = useState<IAdminDashboardQP[]>([]);
	const [numUniqueCourseCodes, setNumUniqueCourseCodes] = useState<number>(0);
	const [awaitingResponse, setAwaitingResponse] = useState<boolean>(false);
	const [ocrDetails, setOcrDetails] = useState<Map<number, IExtractedDetails>>(new Map());
	const [ocrRequests, setOcrRequests] = useState<IAdminDashboardQP[]>([]);
	const [ocrMessage, setOcrMessage] = useState<string | null>(null);
	const [ocrLoopOn, setOcrLoopOn] = useState<boolean>(false);

	const [selectedQPaper, setSelectedQPaper] =
		useState<IAdminDashboardQP | null>(null);

	const handlePaperEdit = async (qp: IAdminDashboardQP) => {
		// Only approves the paper rn
		// TODO: Allow unapproving papers as well

		const response = await makeRequest('approve', 'post', {
			...qp,
			filelink: new URL(qp.filelink).pathname // TODO: PLEASE DO THIS IN THE BAKCEND AHHHH ITS CALLED FILELINK NOT FILEPATH DED
		}, auth.jwt);

		if (response.status === "success") {
			toast.success(response.message);

			setUnapprovedPapers((papers) => {
				const newPapers = [...papers];

				const selectedIndex = newPapers.indexOf(selectedQPaper!);
				if (selectedIndex !== -1) {
					newPapers[selectedIndex] = {
						...qp,
						approve_status: true
					}
				}

				return newPapers;
			})
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
			setOcrRequests(papers.data.slice(0, 20));
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

	const handlePaperDelete = async (deleteQp: IAdminDashboardQP) => {
		const response = await makeRequest('delete', 'post', { id: deleteQp.id }, auth.jwt);

		if (response.status === "success") {
			toast.success(response.message);

			setUnapprovedPapers((papers) => {
				return papers.filter((qp) => qp != deleteQp);
			})
		} else {
			toast.error(`Delete error: ${response.message} (${response.status_code})`);
		}
	}

	useEffect(() => {
		if (!auth.isAuthenticated) {
			window.location.assign(OAUTH_LOGIN_URL);
		} else {
			fetchUnapprovedPapers();
		}
	}, [])

	const storeOcrDetails = async (paper: IAdminDashboardQP) => {
		if (!ocrDetails.has(paper.id)) {
			setOcrMessage(`Running OCR for ${paper.course_name} - ${paper.course_code} (id: ${paper.id})`);
			const response = await fetch(paper.filelink);

			if (response.ok) {
				const pdfData = await response.arrayBuffer();
				const pdfText = await extractTextFromPDF(pdfData);

				setOcrDetails((currentValue) => currentValue.set(paper.id, extractDetailsFromText(pdfText)));
			}
		}
	}

	const ocrDetailsLoop = async () => {
		if (!ocrLoopOn) {
			setOcrLoopOn(true);
			const request = ocrRequests.shift();

			if (request) {
				await storeOcrDetails(request);
			}
			setOcrRequests((reqs) => reqs.filter(req => req !== request));
			setOcrLoopOn(false);
		}
	}

	useEffect(() => {
		ocrDetailsLoop();
	}, [ocrRequests])

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
							<p><b>OCR details</b>: {ocrDetails.size} papers (loop {ocrLoopOn ? 'On' : 'Off'})</p>
							{ocrMessage !== null &&<p>{ocrMessage}</p>}
						</div>
						<div className="papers-panel">
							{unapprovedPapers.map((paper, i) => <QPCard
								onEdit={(e) => {
									e.preventDefault();

									if (!ocrDetails.has(paper.id)) {
										// If ocr doesn't exist, push to the start of the queue
										setOcrRequests((reqs) => [paper, ...reqs]);
									}
									setSelectedQPaper(paper);
								}}
								onDelete={() => {
									handlePaperDelete(paper);
								}}
								qPaper={paper}
								hasOcr={ocrDetails.has(paper.id)}
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
				ocrDetails={ocrDetails.get(selectedQPaper.id)}
			/>
		)}
	</div> : <p>You are unauthenticated. This incident will be reported.</p>;
}

export default AdminDashboard;