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
import {
	extractDetailsFromText,
	extractTextFromPDF,
	IExtractedDetails,
} from "../utils/autofillData";
import { FaX } from "react-icons/fa6";

type SelectedPaper = {
	type: "unapproved";
	index: number;
} | {
	type: "external";
	data: IAdminDashboardQP;
}

function AdminDashboard() {
	const auth = useAuthContext();
	const [unapprovedPapers, setUnapprovedPapers] = useState<
		IAdminDashboardQP[]
	>([]);
	const [numUniqueCourseCodes, setNumUniqueCourseCodes] = useState<number>(0);
	const [awaitingResponse, setAwaitingResponse] = useState<boolean>(false);
	const [ocrDetails, setOcrDetails] = useState<
		Map<number, IExtractedDetails>
	>(new Map());
	const [ocrRequests, setOcrRequests] = useState<IAdminDashboardQP[]>([]);
	const [ocrMessage, setOcrMessage] = useState<string | null>(null);
	const [ocrLoopOn, setOcrLoopOn] = useState<boolean>(false);

	const [selectedQPaper, setSelectedQPaper] = useState<
		SelectedPaper | null
	>(null);

	const handlePaperEdit = async (qp: IAdminDashboardQP, replace: number[]) => {
		const response = await makeRequest(
			"edit",
			"post",
			{
				...qp,
				replace,
			},
			auth.jwt,
		);

		if (response.status === "success") {
			toast.success(response.message);

			setUnapprovedPapers((papers) => {
				const newPapers = [...papers];

				if (selectedQPaperIndex !== null) {
					newPapers[selectedQPaperIndex] = {
						...qp,
					};
				}

				return newPapers;
			});
		} else {
			toast.error(
				`Approve error: ${response.message} (${response.status_code})`,
			);
		}
	};

	const fetchUnapprovedPapers = async () => {
		setAwaitingResponse(true);
		// TODO: Show all uploaded papers or only unapproved based on user toggle
		const papers = await makeRequest("unapproved", "get", null, auth.jwt);

		if (papers.status === "success") {
			setUnapprovedPapers(papers.data);
			setOcrRequests(papers.data.slice(0, 20));
			setNumUniqueCourseCodes(
				// Make an array of course codes
				papers.data
					.map((paper) => paper.course_code)
					.filter(
						// Keep unqiue values
						(code, i, arr) => arr.indexOf(code) === i,
					).length,
			);
		}

		setAwaitingResponse(false);
	};

	const handlePaperDelete = async (deleteQp: IAdminDashboardQP) => {
		const deleteInterval = 8;
		let toastId: string | null = null;

		const deleteTimeout = setTimeout(async () => {
			const response = await makeRequest(
				"delete",
				"post",
				{ id: deleteQp.id },
				auth.jwt,
			);

			if (response.status === "success") {
				if (toastId !== null)
					toast.success(`${response.message} (id: ${deleteQp.id})`, { id: toastId });

				setUnapprovedPapers((papers) => {
					return papers.filter((qp) => qp != deleteQp);
				});
			} else {
				if (toastId !== null)
					toast.error(
						`Delete error: ${response.message} (${response.status_code})`,
						{ id: toastId },
					);
			}
		}, deleteInterval * 1000);

		const onAbort = () => {
			clearTimeout(deleteTimeout);

			if (toastId !== null) {
				toast.success(`Aborted paper deletion (id: ${deleteQp.id})`, {
					id: toastId,
				});
				toastId = null;
			}
		};

		toastId = toast.loading(
			<div className="delete-toast">
				<p>
					Deleting paper {deleteQp.course_name} (id: {deleteQp.id}) in {deleteInterval}s.
				</p>
				<button onClick={onAbort}><FaX />Cancel</button>
			</div>,
			{ duration: (deleteInterval + 1) * 1000 },
		);
	};

	useEffect(() => {
		if (!auth.isAuthenticated) {
			window.location.assign(OAUTH_LOGIN_URL);
		} else {
			fetchUnapprovedPapers();
		}
	}, []);

	const storeOcrDetails = async (paper: IAdminDashboardQP) => {
		if (!ocrDetails.has(paper.id)) {
			setOcrMessage(
				`Running OCR for ${paper.course_name} - ${paper.course_code} (id: ${paper.id})`,
			);
			const response = await fetch(paper.filelink);

			if (response.ok) {
				try {
					const pdfData = await response.arrayBuffer();
					const pdfText = await extractTextFromPDF(pdfData);

					setOcrDetails((currentValue) =>
						currentValue.set(
							paper.id,
							extractDetailsFromText(pdfText),
						),
					);
				} catch (e) {
					toast.error(`OCR failed for id:${paper.id}. Error: ${e}`);
				}
			}
		}
	};

	const ocrDetailsLoop = async () => {
		if (!ocrLoopOn) {
			setOcrLoopOn(true);
			const request = ocrRequests.shift();

			if (request) {
				await storeOcrDetails(request);
			}
			setOcrRequests((reqs) => reqs.filter((req) => req !== request));
			setOcrLoopOn(false);
		}
	};

	// useEffect(() => {
	// 	ocrDetailsLoop();
	// }, [ocrRequests])

	return auth.isAuthenticated ? (
		<div id="admin-dashboard">
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
					icon: MdLogout,
				}}
			/>

			<div className="dashboard-container">
				{awaitingResponse ? (
					<Spinner />
				) : (
					<>
						<div className="side-panel">
							<p>
								<b>Unapproved papers</b>:{" "}
								{unapprovedPapers.length}
							</p>
							<p>
								<b>Unique Course Codes</b>:{" "}
								{numUniqueCourseCodes}
							</p>
							<p>
								<b>OCR details</b>: {ocrDetails.size} papers
								(loop {ocrLoopOn ? "On" : "Off"})
							</p>
							{ocrMessage !== null && <p>{ocrMessage}</p>}
						</div>
						<div className="papers-panel">
							{unapprovedPapers.map((paper, i) => (
								<QPCard
									onEdit={(e) => {
										e.preventDefault();

										if (!ocrDetails.has(paper.id)) {
											// If ocr doesn't exist, push to the start of the queue
											setOcrRequests((reqs) => [
												paper,
												...reqs,
											]);
										}
										setSelectedQPaperIndex(i);
									}}
									onDelete={(e) => {
										e.preventDefault();
										handlePaperDelete(paper);
									}}
									qPaper={paper}
									hasOcr={ocrDetails.has(paper.id)}
									key={i}
								/>
							))}
						</div>
					</>
				)}
			</div>

			{selectedQPaperIndex !== null && (
				<PaperEditModal
					onClose={() => setSelectedQPaperIndex(null)}
					onDelete={(e) => {
						e.preventDefault();
						handlePaperDelete(
							unapprovedPapers[selectedQPaperIndex],
						);
					}}
					selectNext={
						selectedQPaperIndex < unapprovedPapers.length - 1
							? () => {
									setSelectedQPaperIndex(
										selectedQPaperIndex + 1,
									);
								}
							: null
					}
					selectPrev={
						selectedQPaperIndex > 0
							? () => {
									setSelectedQPaperIndex(
										selectedQPaperIndex - 1,
									);
								}
							: null
					}
					qPaper={unapprovedPapers[selectedQPaperIndex]}
					updateQPaper={(qp, replace) => handlePaperEdit(qp, replace)}
					ocrDetails={ocrDetails.get(
						unapprovedPapers[selectedQPaperIndex].id,
					)}
				/>
			)}
		</div>
	) : (
		<p>You are unauthenticated. This incident will be reported.</p>
	);
}

export default AdminDashboard;
