import { createRef, Dispatch, MouseEventHandler, useState } from "react";
import { IQuestionPaperFile } from "../../types/question_paper";
import { FileCard } from "./FileCard";
import Spinner from "../Spinner/Spinner";
import { AiOutlineCloudUpload, AiOutlineFileAdd } from "react-icons/ai";
import { validate } from "../../utils/validateInput";
import { UploadDragAndDrop } from "./UploadDragAndDrop";

interface IUploadFormProps {
	max_upload_limit: number;
	awaitingResponse: boolean;

	handleUpload: () => void;
	setAwaitingResponse: Dispatch<React.SetStateAction<boolean>>;
}
export function UploadForm(props: IUploadFormProps) {
	const [qPapers, setQPapers] = useState<IQuestionPaperFile[]>([]);
	const [selectedQPaper, setSelectedQPaper] =
		useState<IQuestionPaperFile | null>(null);

	const isQPValid = (data: IQuestionPaperFile) => {
		return !Object.values(validate(data)).some(Boolean);
	};

	const addQPapers = async (newFiles: File[]) => {
		try {
			props.setAwaitingResponse(true); // Set loading state to true
			const newQPsPromises = newFiles.map(async (newFile) => {
				const qpDetails = await autofillData(newFile.name, newFile);
				return { file: newFile, ...qpDetails };
			});

			const newQPs = await Promise.all(newQPsPromises);

			if (newQPs.length > 0) {
				setQPapers((prevQPs) => [...prevQPs, ...newQPs]);
			}
		} catch (error) {
			console.error('Error adding question papers:', error);
		} finally {
			props.setAwaitingResponse(false); // Set loading state to false
		}
	};

	const removeQPaper = (filename: string) => {
		setQPapers((prevQPs) =>
			prevQPs.filter((qp) => qp.file.name !== filename)
		);
	};

	const fileInputRef = createRef<HTMLInputElement>();
	const openFileDialog: MouseEventHandler = (e) => {
		e.stopPropagation();
		fileInputRef.current?.click();
	};

	return <div className="upload-section">
		{
			qPapers.length > 0 ? (
				<>
					<div className="uploaded-files">
						{qPapers.map(
							(qp, i) => <div key={i}>
								<FileCard
									qPaper={qp}
									removeQPaper={removeQPaper}
									edit={setSelectedQPaper}
								/>
								{!isQPValid(qp) && (
									<p className="error-msg">
										Invalid course details
									</p>
								)}
							</div>
						)}
					</div>
					<div className="upload-section-btns">
						<button onClick={props.handleUpload} className="upload-btn">
							{props.awaitingResponse ? (
								<>
									Uploading
									<div className="spinner">
										<Spinner />
									</div>
								</>
							) : (
								<><AiOutlineCloudUpload size="1.5rem" />Upload</>
							)}
						</button>
						{qPapers.length <= props.max_upload_limit && <button onClick={openFileDialog}>
							<AiOutlineFileAdd size="1.5rem" />Add More Files
						</button>}
					</div>
				</>
			) : (
				!props.awaitingResponse && <UploadDragAndDrop max_upload_limit={props.max_upload_limit} fileInputRef={fileInputRef} addQPapers={addQPapers} openFileDialog={openFileDialog} />
			)
		}
	</div >;
}