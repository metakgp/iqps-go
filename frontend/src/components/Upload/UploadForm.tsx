import { createRef, MouseEventHandler, useEffect, useState } from "react";
import { IQuestionPaperFile } from "../../types/question_paper";
import { FileCard } from "./FileCard";
import Spinner from "../Spinner/Spinner";
import { AiOutlineCloudUpload, AiOutlineFileAdd } from "react-icons/ai";
import { isQPValid } from "../../utils/validateInput";
import { UploadDragAndDrop } from "./UploadDragAndDrop";
import PaperEditModal from "../Common/PaperEditModal";
import { autofillData } from "../../utils/autofillData";
import './styles/upload_form.scss';

interface IUploadFormProps {
	max_upload_limit: number;
	uploading: boolean;

	handleUpload: (qpapers: IQuestionPaperFile[]) => Promise<boolean>;
}

export interface UploadFileData {
	qp: IQuestionPaperFile,
	ocr: boolean,
}
export function UploadForm(props: IUploadFormProps) {
	const [qPapers, setQPapers] = useState<UploadFileData[]>([]);
	const [selectedQPaper, setSelectedQPaper] =
		useState<IQuestionPaperFile | null>(null);
	const [ocrLoopOn, setOcrLoopOn] = useState<boolean>(false);
	const [processingComplete, setProcessingComplete] = useState<boolean>(false);

	const addQPapers = (newFiles: File[]) => {
		setQPapers((prevQPs) => {
			const newQPs: UploadFileData[] = newFiles.map((file) => {
				return {
					ocr: false,
					qp: {
						file,
						// Placeholder data
						course_code: '',
						course_name: '',
						year: 1984,
						semester: 'autumn',
						exam: 'ct'
					}
				}
			})

			return [...prevQPs, ...newQPs];
		})

		setProcessingComplete(false);
	}

	const ocrDetailsLoop = async () => {
		if (!ocrLoopOn) {
			setOcrLoopOn(true);

			const ocrRequests = qPapers.filter((paper) => !paper.ocr);
			if (ocrRequests.length === 0) {
				setProcessingComplete(true);
				return setOcrLoopOn(false);
			} else {
				setProcessingComplete(false);
			}

			const request = ocrRequests.shift();

			if (request) {
				let data = await autofillData(request.qp.file.name, request.qp.file);

				setQPapers((currentPapers) => {
					return currentPapers.map(
						(file) => file.qp.file === request.qp.file ?
							{
								qp: {
									...data,
									file: file.qp.file
								}, ocr: true
							} : file
					)
				});

				setOcrLoopOn(false);
			}
		}
	}

	useEffect(() => {
		ocrDetailsLoop();
	}, [qPapers])

	const removeQPaper = (filename: string) => {
		setQPapers((prevQPs) =>
			prevQPs.filter((qp) => qp.qp.file.name !== filename)
		);
	};

	const updateQPaper = (updated: IQuestionPaperFile) => {
		let updateData = qPapers.map((qp) => {
			if (qp.qp.file.name == updated.file.name) return {
				ocr: qp.ocr,
				qp: updated,
			};
			else return qp;
		});
		setQPapers(updateData);
		setSelectedQPaper(null);
	};

	const onUpload: MouseEventHandler = async (e) => {
		e.preventDefault();
		const success = await props.handleUpload(qPapers.map((qp) => qp.qp));

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
				addQPapers(newFiles);
			}
		}
	};

	return <div className="upload-form">
		{
			qPapers.length > 0 ? (
				<>
					<div className="uploaded-files">
						{qPapers.map(
							(file, i) => <div key={i}>
								<FileCard
									file={file}
									removeQPaper={removeQPaper}
									edit={setSelectedQPaper}
									invalidDetails={file.ocr && !isQPValid(file.qp)}
								/>
							</div>
						)}
					</div>
					<div className="upload-form-btns">
						<button disabled={!processingComplete || props.uploading} onClick={onUpload} className="upload-btn">
							{!processingComplete || props.uploading ? (
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
				!props.uploading && <UploadDragAndDrop max_upload_limit={props.max_upload_limit} addQPapers={addQPapers} openFileDialog={openFileDialog} />
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
	</div >;
}