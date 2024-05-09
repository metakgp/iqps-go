import { A } from "@solidjs/router";
import { Component, For, createSignal } from "solid-js";
import { FileCard } from "../components/FileCard";
import toast, { Toaster } from "solid-toast";
import { AiOutlineCloudUpload as UploadIcon, AiOutlineFileAdd as FileAddIcon } from "solid-icons/ai";
import { IoSearch as SearchIcon } from "solid-icons/io";
import { autofillData, sanitizeQP } from "../utils/autofillData";
import { IQuestionPaperFile, UploadResults } from "../types/types";
import Modal from "../components/EditModal";
import { Spinner } from "../components/Spinner";
import { validate } from "../utils/validateInput";

const UploadPage: Component = () => {
    const [qPapers, setQPapers] = createSignal<IQuestionPaperFile[]>([]);
    const [isDragging, setIsDragging] = createSignal(false);
    const [isVisible, setIsVisible] = createSignal(true);
    const [selectedQPaper, setSelectedQPaper] =
        createSignal<IQuestionPaperFile | null>(null);
    const [awaitingResponse, setAwaitingResponse] =
        createSignal<boolean>(false);

    let fileInputRef!: HTMLInputElement;

    // state modifying actions
    const removeQPaper = (filename: string) => {
        setQPapers((prevQPs) =>
            prevQPs.filter((qp) => qp.file.name !== filename)
        );
    };
    const addQPapers = (newFiles: File[]) => {
        const newQPs = newFiles.map((newFile) => {
            return { file: newFile, ...autofillData(newFile.name) };
        });

        if (newQPs.length > 0) {
            setQPapers([...qPapers(), ...newQPs]);
        }
    };
    const clearQPapers = () => setQPapers([]);
    const updateQPaper = (updated: IQuestionPaperFile) => {
        let updateData = qPapers().map((qp) => {
            if (qp.file.name == updated.file.name) return updated;
            else return qp;
        });
        setQPapers(updateData);
    };

    const openModal = (qp: IQuestionPaperFile) => {
        setSelectedQPaper(qp);
    };
    const closeModal = () => {
        setSelectedQPaper(null);
    };

    // event handlers
    const openFileDialog = (e: Event) => {
        e.stopPropagation();
        fileInputRef.click();
    };
    const onFileInputChange = (e: Event) => {
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
    const onFileDrop = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) {
            const pdfFiles = [...e.dataTransfer.files].filter(
                (file) => file.type === "application/pdf"
            );
            if (pdfFiles && pdfFiles.length > 0) {
                addQPapers(pdfFiles);
            } else {
                toast.error("Could not catch files. Please try again");
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
    const handleUpload = async (e: Event) => {
        e.preventDefault();
        const allValid = qPapers().every((qp) => isValid(qp));
        if (!allValid) {
            toast.error("Please provide correct course details");
            return;
        }

        if (!awaitingResponse()) {
            try {
                const formData = new FormData();
                qPapers().forEach((qp) => {
                    const {
                        file,
                        course_code,
                        course_name,
                        year,
                        exam,
                        semester,
                        file_name
                    } = sanitizeQP(qp);

                    formData.append("files", file, file_name);
                    formData.append(
                        file_name,
                        `${course_code}_${course_name}_${year}_${exam}_${semester}`
                    );
                });

                setAwaitingResponse(true);
                console.log(formData);
                const response = await fetch(
                    `${import.meta.env.VITE_BACKEND_URL}/upload`,
                    {
                        method: "POST",
                        body: formData
                    }
                );
                const data: UploadResults = await response.json();

                data.forEach((result) => {
                    if (result.status === "success") {
                        toast.success(
                            `File ${result.filename} uploaded successfully`
                        );
                    } else {
                        toast.error(
                            `Failed to upload file ${result.filename}: ${result.description}`
                        );
                    }
                });

                clearQPapers();
                setAwaitingResponse(false);
            } catch (error) {
                console.error("Error during upload:", error);
                setAwaitingResponse(false);
            }
        }
    };

    const isValid = (data: IQuestionPaperFile) => {
        return !Object.values(validate(data)).some(Boolean);
    };

    return (
        <div class="upload-page">
            <div class="title">
                <h1>IQPS - Question Paper Upload</h1>
                <p>
                    <i>Upload your question papers for future humans to use!</i>
                </p>
                <h3 class="header-search-encourager">
                    Want to find a question paper? <A href="/" class="header-search-sender"><SearchIcon size="1.5rem" />Search!</A>
                </h3>
            </div>

            <div class="upload-wrapper">
                <div class="upload-instructions">
                    <h2
                        class={`accordion-heading ${
                            isVisible() ? "accordion-open" : ""
                        }`}

                    >
                        Upload Instructions
                    </h2>
                    <div
                        class={`accordion-content ${
                            isVisible() ? "accordion-visible" : ""
                        }`}
                    >
                        <div class="instruction-section">
                            <h3>File Format</h3>
                            <p>Only PDF files are accepted.</p>
                        </div>
                        <div class="instruction-section">
                            <h3>File Naming (optional)</h3>
                            <p>Use this format:</p>
                            <p class="file-format-example">course_code.pdf</p>
                            <p>
                                <strong>Example:</strong>
                                <br />
                                <em>CS10001.pdf</em>
                            </p>
                        </div>
                        <div class="instruction-section">
                            <h3>How to Upload</h3>
                            <p>Click "Choose File" to select your PDF.</p>
                            <p>Click "Upload" to submit.</p>
                        </div>
                        <h3>NOTE: The uploaded paper will be searchable only after manual review process first. Please wait for a few days and do not re-upload.</h3>
                    </div>
                </div>

                <div class="upload-section">
                    {qPapers().length > 0 ? (
                        <>
                            <div class="uploaded-files">
                                <For each={Array.from(qPapers())}>
                                    {(qp) => (
                                        <div>
                                            <FileCard
                                                qPaper={qp}
                                                removeQPaper={removeQPaper}
                                                edit={openModal}
                                            />
                                            {!isValid(qp) && (
                                                <p class="error-msg">
                                                    Invalid course details
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </For>
                            </div>
                            <div class="upload-section-btns">
                                <button onClick={handleUpload} class="upload-btn">
                                    {awaitingResponse() ? (
                                        <>
                                            Uploading
                                            <div class="spinner">
                                                <Spinner />
                                            </div>
                                        </>
                                    ) : (
                                        <><UploadIcon size="1.5rem" />Upload</>
                                    )}
                                </button>
                                <button onClick={openFileDialog}>
                                    <FileAddIcon size="1.5rem" />Add More Files
                                </button>
                            </div>
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
            {selectedQPaper() && (
                <Modal
                    close={closeModal}
                    qPaper={selectedQPaper()!}
                    update={updateQPaper}
                />
            )}
        </div>
    );
};

export default UploadPage;
