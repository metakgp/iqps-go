import { FaSearch } from "react-icons/fa";
import { Header } from "../components/Common/Common";
import { createRef, MouseEventHandler, useState } from "react";
import Spinner from "../components/Spinner/Spinner";
import { UploadInstructions } from "../components/Upload/UploadInstructions";
// import { UploadForm } from "../components/Upload/UploadForm";
import toast from "react-hot-toast";
import { IQuestionPaperFile } from "../types/question_paper";
import { isQPValid } from "../utils/validateInput";
import { makeRequest } from "../utils/backend";
import { autofillData, sanitizeQP } from "../utils/autofillData";
import "./styles/upload_page.scss";
import { UploadDragAndDrop } from "../components/Upload/UploadDragAndDrop";
import { FileCard } from "../components/Upload/FileCard";
import { AiOutlineCloudUpload, AiOutlineFileAdd } from "react-icons/ai";
import PaperEditModal from "../components/Upload/PaperEditModal";

function UploadPage() {
    return (
        <div id="upload-page">
            <Header
                title="Question Paper Upload"
                subtitle="Upload your question papers for the benefit of humanity."
                link={{
                    to: "/",
                    icon: FaSearch,
                    text: "Want to find a question paper?",
                    button_text: "Search!",
                }}
            />

            <div className="upload-wrapper">
                <UploadInstructions />
                <UploadPageMain />
            </div>
        </div>
    );
}

{
    /*
Screens: DnD screen, Loading Screen, Uploading Screen, Files Screen

DnD Screen: No files + No loading (qPapers.length < 1 && !processing)
Loading Screen: processing selected files (qPapers.length >= 1 && processing)
Uploading Screen: On clicking upload button (qPapers.length >= 1 && uploading)
Files Screen: After processing selected files (qPapers.length >= 1 && !uploading)

Order:
DnD screen -> Loading Screen -> Files Screen -> Uploading Screen -> DnD screen

*/
}

function UploadPageMain() {
    let MAX_UPLOAD_LIMIT = parseInt(import.meta.env.VITE_MAX_UPLOAD_LIMIT);
    if (isNaN(MAX_UPLOAD_LIMIT) || MAX_UPLOAD_LIMIT < 1) {
        MAX_UPLOAD_LIMIT = 10;
    }

    const [qPapers, setQPapers] = useState<IQuestionPaperFile[]>([]);
    const [processing, setProcessing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedQPaper, setSelectedQPaper] =
        useState<IQuestionPaperFile | null>(null);

    const addQPapers = async (newFiles: File[]) => {
        try {
            setProcessing(true);
            const newQPsPromises = newFiles.map(async (newFile) => {
                const qpDetails = await autofillData(newFile.name, newFile);
                return { file: newFile, ...qpDetails };
            });

            const newQPs = await Promise.all(newQPsPromises);

            if (newQPs.length > 0) {
                setQPapers((prevQPs) => [...prevQPs, ...newQPs]);
            }
        } catch (error) {
            console.error("Error adding question papers:", error);
        } finally {
            setProcessing(false);
        }
    };

    const updateQPaper = (updated: IQuestionPaperFile) => {
        let updateData = qPapers.map((qp) => {
            if (qp.file.name == updated.file.name) return updated;
            else return qp;
        });
        setQPapers(updateData);
    };

    const removeQPaper = (filename: string) => {
        setQPapers((prevQPs) =>
            prevQPs.filter((qp) => qp.file.name !== filename)
        );
    };

    const handleUpload = async (
        qPapers: IQuestionPaperFile[]
    ): Promise<boolean> => {
        if (qPapers.length > MAX_UPLOAD_LIMIT) {
            toast.error(`max ${MAX_UPLOAD_LIMIT} files allowed`);
            return false;
        }

        const allValid = qPapers.every((qp) => isQPValid(qp));

        if (!allValid) {
            toast.error("Please provide correct course details");
            return false;
        }

        if (!uploading) {
            try {
                const formData = new FormData();
                const numPapers = qPapers.length;
                for (const qp of qPapers) {
                    const {
                        file,
                        course_code,
                        course_name,
                        year,
                        exam,
                        semester,
                        file_name,
                    } = await sanitizeQP(qp);

                    formData.append("files", file, file_name);
                    formData.append(
                        file_name,
                        `${course_code}_${course_name}_${year}_${exam}_${semester}`
                    );
                }
                toast(
                    `Uploading ${numPapers} file${numPapers > 1 ? "s" : ""}.`
                );

                setUploading(true);
                const response = await makeRequest("upload", "post", formData);

                if (response.status === "success") {
                    const upload_results = response.data;

                    for (const result of upload_results) {
                        if (result.status === "success") {
                            toast.success(
                                `File ${result.filename} uploaded successfully`
                            );
                        } else {
                            toast.error(
                                `Failed to upload file ${result.filename}: ${result.description}`
                            );
                        }
                    }

                    if (upload_results.length < numPapers) {
                        const failedPapers = numPapers - upload_results.length;
                        toast.error(
                            `${failedPapers} paper${
                                failedPapers > 1 ? "s" : ""
                            } failed to upload.`
                        );
                    }

                    setUploading(false);
                    return true;
                } else {
                    toast.error(
                        `Failed to upload files. Error: ${response.message} (${response.status_code})`
                    );
                    setUploading(false);
                    return false;
                }
            } catch (error) {
                toast.error(
                    "Failed to upload file due to an unknown error. Please try again later."
                );
                console.error("Upload error:", error);
                setUploading(false);

                return false;
            }
        }

        return false;
    };

    const onUpload: MouseEventHandler = async (e) => {
        e.preventDefault();
        const success = await handleUpload(qPapers);

        if (success) {
            setQPapers([]);
            setProcessing(false);
            setUploading(false);
        }
    };

    const fileInputRef = createRef<HTMLInputElement>();
    const openFileDialog: MouseEventHandler = (e) => {
        e.stopPropagation();
        fileInputRef.current?.click();
    };

    return (
        <>
            {qPapers.length > 0 ? (
                <>
                    <div className="uploaded-files">
                        {qPapers.map((qp, i) => (
                            <div key={i}>
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
                        ))}
                    </div>
                    <div className="upload-form-btns">
                        <button onClick={onUpload} className="upload-btn">
                            {uploading ? (
                                <>
                                    Uploading
                                    <div className="spinner">
                                        <Spinner />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <AiOutlineCloudUpload size="1.5rem" />
                                    Upload
                                </>
                            )}
                        </button>
                        {qPapers.length <= MAX_UPLOAD_LIMIT && (
                            <button onClick={openFileDialog}>
                                <AiOutlineFileAdd size="1.5rem" />
                                Add More Files
                            </button>
                        )}
                    </div>
                </>
            ) : processing ? (
                <>
                    <div className="loading">
                        <div className="spinner">
                            <Spinner />
                        </div>
                        <p className="message">Loading files, please wait...</p>
                    </div>
                </>
            ) : (
                <UploadDragAndDrop
                    addQPapers={addQPapers}
                    fileInputRef={fileInputRef}
                    max_upload_limit={MAX_UPLOAD_LIMIT}
                    openFileDialog={openFileDialog}
                />
            )}

            {selectedQPaper !== null && (
                <PaperEditModal
                    onClose={() => setSelectedQPaper(null)}
                    qPaper={selectedQPaper}
                    updateQPaper={updateQPaper}
                />
            )}
        </>
    );
}

export default UploadPage;
