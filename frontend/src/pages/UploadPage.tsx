import { A } from "@solidjs/router";
import { AiOutlineCloudUpload as UploadIcon } from "solid-icons/ai";
import { Component, For, createSignal } from "solid-js";
import { FileCard } from "../components/FileCard";
import { Toaster, toast } from "solid-toast";

const UploadPage: Component = () => {
    const [files, setFiles] = createSignal<File[]>([]);
    const [isDragging, setIsDragging] = createSignal(false);

    let fileInputRef!: HTMLInputElement;

    const openFileDialog = (e: Event) => {
        e.stopPropagation();
        fileInputRef.click();
    };

    const addFiles = (newFiles: File[]) => {
        const validatedFiles = newFiles.filter((newFile) => {
            const filenameParts = newFile.name.split("_");
            if (filenameParts.length !== 4) {
                console.error(`Invalid filename format: ${newFile.name}`);
                toast.error(`Invalid filename format: ${newFile.name}`);
                return false;
            }

            return true;
        });

        if (validatedFiles.length > 0) {
            setFiles((prevFiles) => [...prevFiles, ...validatedFiles]);
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
            const pdfFiles = [...e.dataTransfer.files].filter(
                (file) => file.type === "application/pdf"
            );
            if (pdfFiles) {
                addFiles(pdfFiles);
            }
            e.dataTransfer.clearData();
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
                <div class="upload-instructions">
                    <h2>Upload Instructions</h2>
                    <div class="instruction-section">
                        <h3>File Format</h3>
                        <p>Only PDF files are accepted.</p>
                    </div>
                    <div class="instruction-section">
                        <h3>File Naming</h3>
                        <p>Use this format:</p>
                        <p class="file-format-example">
                            course_code_year_(midsem/endsem)_(spring/autumn).pdf
                        </p>
                        <p>
                            <strong>Example:</strong>
                            <br />
                            <em>CS10001_2023_midsem_spring.pdf</em>
                        </p>
                    </div>
                    <div class="instruction-section">
                        <h3>How to Upload</h3>
                        <p>Click "Choose File" to select your PDF.</p>
                        <p>Click "Upload" to submit.</p>
                    </div>
                    <p class="note">
                        <strong> Note</strong>: Incorrect names or file types
                        will be rejected.
                    </p>
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
            <Toaster
                toastOptions={{
                    position: "bottom-center",
                    className: "toast",
                }}
            />
        </div>
    );
};

export default UploadPage;
