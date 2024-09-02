import { FaSearch } from "react-icons/fa";
import { Header } from "../components/Common/Common";
import { useState } from "react";
import Spinner from "../components/Spinner/Spinner";
import { UploadInstructions } from "../components/Upload/UploadInstructions";
import { UploadForm } from "../components/Upload/UploadForm";
import toast from "react-hot-toast";
import { IQuestionPaperFile } from "../types/question_paper";
import { isQPValid } from "../utils/validateInput";
import { makeRequest } from "../utils/backend";
import { sanitizeQP } from "../utils/autofillData";
import './styles/upload_page.scss';

function UploadPage() {
	let MAX_UPLOAD_LIMIT = parseInt(import.meta.env.VITE_MAX_UPLOAD_LIMIT)
	if (isNaN(MAX_UPLOAD_LIMIT) || MAX_UPLOAD_LIMIT < 1) {
		MAX_UPLOAD_LIMIT = 10
	}
	const [awaitingResponse, setAwaitingResponse] =
		useState<boolean>(false);

	const handleUpload = async (qPapers: IQuestionPaperFile[]): Promise<boolean> => {
		if (qPapers.length > MAX_UPLOAD_LIMIT) {
			toast.error(`max ${MAX_UPLOAD_LIMIT} files allowed`);
			return false;
		}

		const allValid = qPapers.every((qp) => isQPValid(qp));

		if (!allValid) {
			toast.error("Please provide correct course details");
			return false;
		}

		if (!awaitingResponse) {
			try {
				const formData = new FormData();
				const numPapers = qPapers.length;
				for (const qp of qPapers) {
					const {
						file,
						course_code,
						course_name,
						year,
						exam,
						semester,
						file_name
					} = await sanitizeQP(qp);

					formData.append("files", file, file_name);
					formData.append(
						file_name,
						`${course_code}_${course_name}_${year}_${exam}_${semester}`
					);
				}
				toast(`Uploading ${numPapers} file${numPapers > 1 ? 's' : ''}.`);

				setAwaitingResponse(true);
				const response = await makeRequest('upload', 'post', formData);

				if (response.status === 'success') {
					const upload_results = response.data;

					for (const result of upload_results) {
						if (result.status === "success") {
							toast.success(
								`File ${result.filename} uploaded successfully`
							);
						} else {
							toast.error(
								`Failed to upload file ${result.filename}: ${result.description}`
							);
						}
					}

					if (upload_results.length < numPapers) {
						const failedPapers = numPapers - upload_results.length;
						toast.error(`${failedPapers} paper${failedPapers > 1 ? 's' : ''} failed to upload.`);
					}

					setAwaitingResponse(false);
					return true;
				} else {
					toast.error(`Failed to upload files. Error: ${response.message} (${response.status_code})`);
					setAwaitingResponse(false);
					return false;
				}
			} catch (error) {
				toast.error("Failed to upload file due to an unknown error. Please try again later.");
				console.error("Upload error:", error);
				setAwaitingResponse(false);

				return false;
			}
		}

		return false;
	};

	return <>
		<Header
			title="Question Paper Upload"
			subtitle="Upload your question papers for the benefit of humanity."
			link={{
				to: "/",
				icon: FaSearch,
				text: "Want to find a question paper?",
				button_text: "Search!"
			}}
		/>

		<div className="upload-wrapper">
			<UploadInstructions />

			{
				awaitingResponse ?
					<div className="loading">
						<div className="spinner">
							<Spinner />
						</div>
						<p className="message">
							Loading files, please wait...
						</p>
					</div> :
					<UploadForm
						max_upload_limit={MAX_UPLOAD_LIMIT}
						awaitingResponse={awaitingResponse}

						handleUpload={handleUpload}
						setAwaitingResponse={setAwaitingResponse}
					/>
			}
		</div>
	</>;
}

export default UploadPage;