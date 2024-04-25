import { A } from "@solidjs/router";
import { Component, For, createSignal } from "solid-js";
import { FileCard } from "../components/FileCard";
import toast, { Toaster } from "solid-toast";
import { AiOutlineCloudUpload as UploadIcon } from "solid-icons/ai";
import { FaSolidChevronDown as ChevronIcon } from "solid-icons/fa";
import { autofillData } from "../utils/autofillData";
import { QuestionPaper } from "../types/types";
import Modal from "../components/EditModal";

const UploadPage: Component = () => {
    const [qPapers, setQPapers] = createSignal<QuestionPaper[]>([]);
    const [isDragging, setIsDragging] = createSignal(false);
    const [isVisible, setIsVisible] = createSignal(false);
    const [selectedQPaper, setSelectedQPaper] =
        createSignal<QuestionPaper | null>(null);
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
            setQPapers([...newQPs]);
        }
    };
    const clearQPapers = () => setQPapers([]);
    const updateQPaper = (updated: QuestionPaper) => {
        let updateData = qPapers().map((qp) => {
            if (qp.file.name == updated.file.name) return updated;
            else return qp;
        });
        setQPapers(updateData);
    };

    const openModal = (qp: QuestionPaper) => {
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
            if (pdfFiles) {
                addQPapers(pdfFiles);
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
        console.log(qPapers());
        if (!awaitingResponse()) {
            try {
                const formData = new FormData();
                qPapers().forEach((qp, index) => {
                    formData.append(`file_${index}`, qp.file);
                    formData.append(`course_code_${index}`, qp.course_code);
                    formData.append(`course_name_${index}`, qp.course_name);
                    formData.append(`year_${index}`, qp.year);
                    formData.append(`semester_${index}`, qp.semester);
                    formData.append(`exam_${index}`, qp.exam);
                });

                setAwaitingResponse(true);
                const response = await fetch(
                    `${import.meta.env.VITE_BACKEND_URL}/upload`,
                    {
                        method: "POST",
                        body: formData,
                    }
                );
                const data = await response.json();

                if (data.status == "success")
                    toast.success(
                        `${
                            qPapers().length
                        } question papers uploaded successfully.`
                    );
                else {
                    toast.error(`Some Error Occured`);
                }

                clearQPapers();
                setAwaitingResponse(false);
            } catch (error) {
                console.error("Error during upload:", error);
            }
        }
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
                    <h2
                        class={`accordion-heading ${
                            isVisible() ? "accordion-open" : ""
                        }`}
                        onClick={() => {
                            setIsVisible((x) => !x);
                        }}
                    >
                        Upload Instructions
                        <ChevronIcon class="accordion-icon" size="1rem" />
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
                    </div>
                </div>

                <div class="upload-section">
                    {qPapers().length > 0 ? (
                        <>
                            <div class="uploaded-files">
                                <For each={Array.from(qPapers())}>
                                    {(qp) => (
                                        <FileCard
                                            qPaper={qp}
                                            removeQPaper={removeQPaper}
                                            edit={openModal}
                                        />
                                    )}
                                </For>
                            </div>
                            <button onClick={handleUpload} class="upload-btn">
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
