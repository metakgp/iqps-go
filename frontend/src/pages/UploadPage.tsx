import { A } from "@solidjs/router";
import { AiOutlineCloudUpload as UploadIcon } from "solid-icons/ai";
import { Component, For, createSignal } from "solid-js";
import { FileCard } from "../components/FileCard";

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

    const uploadFiles = (e: Event) => {
        e.preventDefault();
        // TODO : Upload API endpoint call
        console.log(files());
        setFiles([]);
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

            <div class="upload-wrapper">
                <div class="instructions">
                    {/* TODO: Update Instructions */}
                    <h2>Instructions</h2>
                    <ul>
                        <li>
                            Lorem ipsum dolor, sit amet consectetur adipisicing
                            elit. Molestias eligendi perferendis alias odit esse
                            magnam.
                        </li>
                        <li>
                            Lorem ipsum dolor, sit amet consectetur adipisicing
                            elit. Molestias eligendi perferendis alias odit esse
                            magnam.
                        </li>
                        <li>
                            Lorem ipsum dolor, sit amet consectetur adipisicing
                            elit. Molestias eligendi perferendis alias odit esse
                            magnam.
                        </li>
                        <li>
                            Lorem ipsum dolor, sit amet consectetur adipisicing
                            elit. Molestias eligendi perferendis alias odit esse
                            magnam.
                        </li>
                    </ul>
                </div>

                <div class="upload-section">
                    {files().length > 0 ? (
                        <>
                            <div class="uploaded-files">
                                <For each={Array.from(files())}>
                                    {(file) => (
                                        <FileCard
                                            file={file}
                                            removeFile={removeFile}
                                        />
                                    )}
                                </For>
                            </div>
                            <button onClick={uploadFiles} class="upload-btn">
                                Upload
                            </button>
                        </>
                    ) : (
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default UploadPage;
