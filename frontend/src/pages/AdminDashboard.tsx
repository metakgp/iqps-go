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
import { useSearchParams } from "react-router-dom";

type SelectedPaper =
  | {
      type: "unapproved";
      index: number;
    }
  | {
      type: "external";
      data: IAdminDashboardQP;
    };

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

	const [selectedQPaper, setSelectedQPaper] = useState<SelectedPaper | null>(
    null
  );

  const [searchParams, setSearchParams] = useSearchParams();

  const paperRef =
    selectedQPaper === null
      ? null
      : selectedQPaper.type === "unapproved"
      ? unapprovedPapers[selectedQPaper.index]
      : selectedQPaper.data;

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

				if (selectedQPaper && selectedQPaper.type === "unapproved") {
					newPapers[selectedQPaper.index] = {
						...qp,
					};
				} else {
					return papers;
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

	const fetchPaper = async (id: number) => {
    setAwaitingResponse(true);
    const response = await makeRequest("details", "get", { id }, auth.jwt);

    if (response.status === "success") {
      setSelectedQPaper({
        type: "external",
        data: response.data,
      });
    }

    setAwaitingResponse(false);

    if (response.status === "error") {
      toast.error(
        `Could not fetch details for paper with id:${id}`
      );
      setSearchParams({});
    }
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
			const id = +(searchParams.get("edit") || -1);
			if (id && !Number.isNaN(id) && id > 0) {
				const paper = unapprovedPapers.find((qp) => qp.id === id);
	
				if (paper) {
					setSelectedQPaper({
						type: "unapproved",
						index: unapprovedPapers.indexOf(paper),
					});
				} else {
					fetchPaper(id);
				}
			} else if (searchParams.get("edit")) {
				toast.error(`Invalid id (${searchParams.get("edit")}).`);
				setSearchParams({});
			}
		}, [searchParams, unapprovedPapers]);
	
		const openUnapproved = (index: number | null) => {
			if (index === null) {
				setSelectedQPaper(null);
				setSearchParams({});
				return;
			}
	
			const paper = unapprovedPapers[index];
			setSearchParams({ edit: paper.id.toString() });
		};
	

	useEffect(() => {
			fetchUnapprovedPapers();
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

	return (
		<>
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
										openUnapproved(i);
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

			{paperRef && selectedQPaper != null && (
        <PaperEditModal
          onClose={() => openUnapproved(null)}
          onDelete={(e) => {
            e.preventDefault();
            handlePaperDelete(paperRef);
          }}
          selectNext={
            selectedQPaper.type === "unapproved" &&
            selectedQPaper.index < unapprovedPapers.length - 1
              ? () => {
                  openUnapproved(selectedQPaper.index + 1);
                }
              : null
          }
          selectPrev={
            selectedQPaper.type === "unapproved" && selectedQPaper.index > 0
              ? () => {
                  openUnapproved(selectedQPaper.index - 1);
                }
              : null
          }
          qPaper={paperRef}
          updateQPaper={(qp, replace) => handlePaperEdit(qp, replace)}
          ocrDetails={ocrDetails.get(paperRef.id)}
          editPaper={(id) => setSearchParams({ edit: id.toString() })}
        />
      )}
		</>
	);
}

export default AdminDashboard;