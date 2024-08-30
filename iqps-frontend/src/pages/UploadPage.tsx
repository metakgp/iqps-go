import { FaSearch } from "react-icons/fa";
import { Header } from "../components/Common/Common";
import { useState } from "react";
import Spinner from "../components/Spinner/Spinner";
import { IQuestionPaperFile } from "../types/question_paper";
import { UploadInstructions } from "../components/Upload/UploadInstructions";

function UploadPage() {
	let MAX_UPLOAD_LIMIT = parseInt(import.meta.env.VITE_MAX_UPLOAD_LIMIT)
	if (isNaN(MAX_UPLOAD_LIMIT) || MAX_UPLOAD_LIMIT < 1) {
		MAX_UPLOAD_LIMIT = 10
	}
	const [awaitingResponse, setAwaitingResponse] =
		useState<boolean>(false);

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
					<UploadDragAndDrop
						max_upload_limit={MAX_UPLOAD_LIMIT}
						awaitingResponse={awaitingResponse}

						openModal={ }
						handleUpload={ }
						setAwaitingResponse={setAwaitingResponse}
					/>
			}
		</div>
	</>;
}

export default UploadPage;