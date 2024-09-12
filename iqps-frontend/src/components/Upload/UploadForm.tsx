import { createRef, MouseEventHandler, useState } from "react";
import { IQuestionPaperFile } from "../../types/question_paper";
import { FileCard } from "./FileCard";
import Spinner from "../Spinner/Spinner";
import { AiOutlineCloudUpload, AiOutlineFileAdd } from "react-icons/ai";
import { isQPValid } from "../../utils/validateInput";
import { UploadDragAndDrop } from "./UploadDragAndDrop";
import PaperEditModal from "./PaperEditModal";
import { autofillData } from "../../utils/autofillData";
import './styles/upload_form.scss';

interface IUploadFormProps {
	max_upload_limit: number;
	uploading: boolean;

	handleUpload: (qpapers: IQuestionPaperFile[]) => Promise<boolean>;
}
export function UploadForm(props: IUploadFormProps) {
	const [qPapers, setQPapers] = useState<IQuestionPaperFile[]>([]);
	const [selectedQPaper, setSelectedQPaper] =
		useState<IQuestionPaperFile | null>(null);
	const [processing, setProcessing] = useState<boolean>(false);

	const addQPapers = async (newFiles: File[]) => {
		try {
			setProcessing(true); // Set loading state to true
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
			setProcessing(false); // Set loading state to false
		}
	};

	const removeQPaper = (filename: string) => {
		setQPapers((prevQPs) =>
			prevQPs.filter((qp) => qp.file.name !== filename)
		);
	};

	const updateQPaper = (updated: IQuestionPaperFile) => {
		let updateData = qPapers.map((qp) => {
			if (qp.file.name == updated.file.name) return updated;
			else return qp;
		});
		setQPapers(updateData);
	};

	const onUpload: MouseEventHandler = async (e) => {
		e.preventDefault();
		const success = await props.handleUpload(qPapers);

		if (success) setQPapers([]);
	}

	const fileInputRef = createRef<HTMLInputElement>();

	const openFileDialog: MouseEventHandler = (e) => {
		e.stopPropagation();
		fileInputRef.current?.click();
	};

	const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

	return !processing ?
		<div className="upload-form">
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
						<div className="upload-form-btns">
							<button onClick={onUpload} className="upload-btn">
								{(processing || props.uploading) ? (
									<>
										{props.uploading ? 'Uploading Files' : 'Processing Files'}
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
					!(processing || props.uploading) && <UploadDragAndDrop max_upload_limit={props.max_upload_limit} addQPapers={addQPapers} openFileDialog={openFileDialog} />
				)
			}

			{selectedQPaper !== null && (
				<PaperEditModal
					onClose={() => setSelectedQPaper(null)}
					qPaper={selectedQPaper}
					updateQPaper={updateQPaper}
				/>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept=".pdf"
				hidden
				multiple={true}
				onChange={onFileInputChange}
			/>
		</div > :
		<div className="loading">
			<div className="spinner">
				<Spinner />
			</div>
			<p className="message">Processing files, please wait...</p>
		</div>;
}