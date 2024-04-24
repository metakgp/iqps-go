import { A } from "@solidjs/router";
import {
    AiOutlineCloudUpload as UploadIcon,
    AiOutlineFilePdf as PDFIcon,
    AiOutlineDelete as CloseIcon,
} from "solid-icons/ai";
import { Component, For, createSignal } from "solid-js";

const UploadPage: Component = () => {
    const [files, setFiles] = createSignal<File[]>([]);
    const [isDragging, setIsDragging] = createSignal(false);

    let fileInputRef!: HTMLInputElement;

    const openFileDialog = (e: Event) => {
        e.stopPropagation();
        fileInputRef.click();
    };

    const addFiles = (newFiles: File[]) => {
        const filteredFiles = newFiles.filter(
            (newFile) => !files().some((file) => file.name === newFile.name)
        );

        if (filteredFiles.length > 0) {
            setFiles((prevFiles) => [...prevFiles, ...filteredFiles]);
        }
    };

    const onFileInputChange = (e: Event) => {
        e.preventDefault();
        if (e.target) {
            const newFiles = Array.from(
                (e.target as HTMLInputElement).files || []
            );
            if (newFiles) {
                addFiles(newFiles);
            }
        }
    };

    const removeFile = (filename: string) => {
        setFiles((prevFiles) =>
            prevFiles.filter((file) => file.name !== filename)
        );
    };

    const onFileDrop = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) {
            const droppedFiles = [...e.dataTransfer.files];
            const pdfFiles = droppedFiles.filter(
                (file) => file.type === "application/pdf"
            );
            if (pdfFiles) {
                addFiles(pdfFiles);
            }
        }
        setIsDragging(false);
    };

    const onDragEnter = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const onDragExit = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    return (
        <div class="upload-page">
            <div class="title">
                <h1>IQPS - Question Paper Upload</h1>
                <p>
                    <i>Upload your question papers for future humans to use!</i>
                </p>
                <h3>
                    <A href="/">Question paper search</A>
                </h3>
            </div>

            <div class="upload-section">
                <div
                    class={`upload-area ${isDragging() && "active"}`}
                    onDragOver={onDragEnter}
                    onDragLeave={onDragExit}
                    onDrop={onFileDrop}
                    onClick={openFileDialog}
                >
                    <input
                        ref={(el) => (fileInputRef = el)}
                        type="file"
                        accept=".pdf"
                        hidden
                        multiple={true}
                        onChange={onFileInputChange}
                    />
                    <UploadIcon class="upload-icon" size="5rem" />
                    <h2>Click or drop files to upload</h2>
                </div>
                <div class="uploaded-files">
                    <For each={Array.from(files())}>
                        {(file) => (
                            <>
                                <div class="file">
                                    <PDFIcon size="2.5rem" />
                                    <div class="file-name">{file.name}</div>
                                    <CloseIcon
                                        onClick={() => removeFile(file.name)}
                                        class="close-icon"
                                        size="1.25rem"
                                    />
                                </div>
                            </>
                        )}
                    </For>
                </div>
            </div>
        </div>
    );
};

export default UploadPage;
