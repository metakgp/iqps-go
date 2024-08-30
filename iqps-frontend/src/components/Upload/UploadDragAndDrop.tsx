import { useState } from "react";
import toast from "react-hot-toast";
import { AiOutlineCloudUpload } from "react-icons/ai";

interface IUploadDragAndDropProps {
	max_upload_limit: number;
	fileInputRef: React.RefObject<HTMLInputElement>;

	addQPapers: (newFiles: File[]) => Promise<void>;
	openFileDialog: React.MouseEventHandler;
}
export function UploadDragAndDrop(props: IUploadDragAndDropProps) {
	const [isDragging, setIsDragging] = useState<boolean>(false);

	const onDragEnter: React.DragEventHandler<HTMLDivElement> = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	}

	const onDragExit: React.DragEventHandler<HTMLDivElement> = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}

	const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		e.preventDefault();
		if (e.target) {
			const newFiles = Array.from(
				(e.target as HTMLInputElement).files || []
			);
			if (newFiles) {
				await props.addQPapers(newFiles);
			}
		}
	};

	const onFileDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
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
				await props.addQPapers(pdfFiles);
			} else {
				toast.error("Could not catch files. Please try again");
			}
			e.dataTransfer.clearData();
		}

		setIsDragging(false);
	};

	return <div
		className={`upload-area ${isDragging && "active"}`}
		onDragOver={onDragEnter}
		onDragLeave={onDragExit}
		onDrop={onFileDrop}
		onClick={props.openFileDialog}
	>
		<input
			ref={props.fileInputRef}
			type="file"
			accept=".pdf"
			hidden
			multiple={true}
			onChange={onFileInputChange}
		/>
		<AiOutlineCloudUpload className="upload-icon" size="5rem" />
		<h2>Click or drop files to upload</h2>
	</div>;
}