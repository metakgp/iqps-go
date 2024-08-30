import { ChangeEvent, createRef, Dispatch, DragEventHandler, MouseEventHandler, useState } from "react";
import { IQuestionPaperFile } from "../../types/question_paper";
import { FileCard, IFileCardProps } from "./FileCard";
import Spinner from "../Spinner/Spinner";
import { AiOutlineCloudUpload, AiOutlineFileAdd } from "react-icons/ai";
import { validate } from "../../utils/validateInput";
import toast from "react-hot-toast";

interface IUploadDragAndDropProps {
	removeQPaper: IFileCardProps['removeQPaper'];
	max_upload_limit: number;
	awaitingResponse: boolean;

	openModal: () => void;
	handleUpload: () => void;
	setAwaitingResponse: Dispatch<React.SetStateAction<boolean>>;
}
export function UploadDragAndDrop(props: IUploadDragAndDropProps) {
	const [qPapers, setQPapers] = useState<IQuestionPaperFile[]>([]);
	const [isDragging, setIsDragging] = useState<boolean>(false);

	const fileInputRef = createRef<HTMLInputElement>();

	const onDragEnter: DragEventHandler<HTMLDivElement> = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	}

	const onDragExit: DragEventHandler<HTMLDivElement> = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}

	const openFileDialog: MouseEventHandler = (e) => {
		e.stopPropagation();
		fileInputRef.current?.click();
	};

	const isQPValid = (data: IQuestionPaperFile) => {
		return !Object.values(validate(data)).some(Boolean);
	};

	const onFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
		e.preventDefault();
		if (e.target) {
			const newFiles = Array.from(
				(e.target as HTMLInputElement).files || []
			);
			if (newFiles) {
				await addQPapers(newFiles);
			}
		}
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

	const onFileDrop: DragEventHandler<HTMLDivElement> = async (e) => {
		e.preventDefault();

		if (e.dataTransfer) {
			const pdfFiles = [...e.dataTransfer.files].filter(
				(file) => file.type === "application/pdf"
			);
			if (pdfFiles && pdfFiles.length > 0) {
				if (pdfFiles.length > props.max_upload_limit) {
					toast.error(`max ${props.max_upload_limit} files allowed`);
					return;
				}
				await addQPapers(pdfFiles);
			} else {
				toast.error("Could not catch files. Please try again");
			}
			e.dataTransfer.clearData();
		}

		setIsDragging(false);
	};

	return <div className="upload-section">
		{qPapers.length > 0 ? (
			<>
				<div className="uploaded-files">
					{qPapers.map(
						(qp, i) => <div key={i}>
							<FileCard
								qPaper={qp}
								removeQPaper={props.removeQPaper}
								edit={props.openModal}
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
			!props.awaitingResponse && (
				<div
					className={`upload-area ${isDragging && "active"}`}
					onDragOver={onDragEnter}
					onDragLeave={onDragExit}
					onDrop={onFileDrop}
					onClick={openFileDialog}
				>
					<input
						ref={fileInputRef}
						type="file"
						accept=".pdf"
						hidden
						multiple={true}
						onChange={onFileInputChange}
					/>
					<AiOutlineCloudUpload className="upload-icon" size="5rem" />
					<h2>Click or drop files to upload</h2>
				</div>
			)
		)
		}
	</div >;
}