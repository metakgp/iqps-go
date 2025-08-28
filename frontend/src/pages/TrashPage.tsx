import { useEffect, useState } from "react";
import { OAUTH_LOGIN_URL, useAuthContext } from "../utils/auth";
import { makeRequest } from "../utils/backend";
import { IAdminDashboardQP } from "../types/question_paper";
import { Header } from "../components/Common/Common";

import "./styles/trash_page.scss";
import { MdLogout } from "react-icons/md";
import Spinner from "../components/Spinner/Spinner";
import toast from "react-hot-toast";
import { FaFilePdf, FaRegSquare, FaRegSquareCheck, FaTrash, FaX } from "react-icons/fa6";
import { useSearchParams } from "react-router-dom";
import { FaTrashRestore } from "react-icons/fa";

function TrashPage() {
	const auth = useAuthContext();
	const [trashPapers, setTrashPapers] = useState<
		IAdminDashboardQP[]
	>([]);
	const [awaitingResponse, setAwaitingResponse] = useState<boolean>(false);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [allSelected, setAllSelected] = useState<boolean>(false);

	const fetchTrashedPapers = async () => {
		setAwaitingResponse(true);
		const papers = await makeRequest("trash", "get", null, auth.jwt);

		if (papers.status === "success") {
			setTrashPapers(papers.data.slice(0, 40));
		}

		setAwaitingResponse(false);
	};

	const handleDelete = async () => {
		const deleteInterval = 8;
		let toastId: string | null = null;

		const deleteTimeout = setTimeout(async () => {
			const response = await makeRequest(
				"harddelete",
				"post",
				{ ids: selectedIds },
				auth.jwt,
			);

			if (response.status === "success") {
				if (toastId !== null)
					toast.success(`${response.message}`, {id: toastId});

				setTrashPapers((papers) => {
					return papers.filter((qp) => !selectedIds.includes(qp.id));
				});
				setSelectedIds([]);
				setAllSelected(false);
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
				toast.success("Aborted paper deletion.", {id: toastId});
				toastId = null;
				setSelectedIds([]);
				setAllSelected(false);
			}
		};

		toastId = toast.loading(
			<div className="delete-toast">
				<p>
					Deleting selected {selectedIds.length} papers
				</p>
				<button onClick={onAbort}><FaX />Cancel</button>
			</div>,
			{ duration: (deleteInterval + 1) * 1000 },
		);
	};

	useEffect(() => {
		if (allSelected) {
			setSelectedIds(trashPapers.map(p => p.id));
		} else {
			setSelectedIds([]);
		}
	}, [allSelected])

	

	useEffect(() => {
		if (!auth.isAuthenticated) {
			window.location.assign(OAUTH_LOGIN_URL);
		} else {
			fetchTrashedPapers();
		}
	}, []);

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
								<b>Trashed papers</b>:{" "}
								{trashPapers.length}
							</p>
						</div>
						<div className="papers-panel">
							{trashPapers.length === 0 ? (
								<p>No papers in trash.</p>
							) : (
								<>
									<div className="actions">
										<div className="select-all">
											<button className="btn" onClick={() => {
												setAllSelected(prev => !prev);
											}}>
												{allSelected ? <FaRegSquareCheck size="1.2em" /> : <FaRegSquare size="1.2em" />}
											</button>
											Select All
										</div>

										<div>
											<button className="btn icon-btn filled delete" onClick={handleDelete} disabled={selectedIds.length < 1}>
												<FaTrash />
												Delete Forever
											</button>
										</div>

										{/* <div> // TODO
											<button className="btn icon-btn filled">
												<FaTrashRestore />
												Restore
											</button>
										</div> */}
									</div>
									<div className="papers-list">
										{trashPapers.map((paper) => (
											<div key={paper.id}>
												<div className="trash-paper">
													<button className="btn" onClick={() => {
														setSelectedIds(prev => {
															if (prev.includes(paper.id)) return prev.filter(id => id != paper.id);
															else return [...prev, paper.id];
														})
													}}>
														{selectedIds.includes(paper.id) ? <FaRegSquareCheck size="1.2em" /> : <FaRegSquare size="1.2em" />}
													</button>
													<div className="course">
														{paper.course_name}{" "}
														{paper.course_code ? `(${paper.course_code})` : ""}
													</div>
													<div className="pills">
														<div className="pill">{paper.year}</div>
														<div className="pill">{paper.exam}</div>
														<div className="pill">{paper.semester}</div>
														{paper.note !== "" && <div className="pill">{paper.note}</div>}
													</div>
													<button className="btn">
														<FaFilePdf size="1.2em" />
													</button>
												</div>
											</div>
										))}
									</div>
								</>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	) : (
		<p>You are unauthenticated. This incident will be reported.</p>
	);
}

export default TrashPage;
