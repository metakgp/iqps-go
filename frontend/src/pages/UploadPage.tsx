import { FaSearch } from "react-icons/fa";
import { Header } from "../components/Common/Common";
import { useState } from "react";
import { UploadInstructions } from "../components/Upload/UploadInstructions";
import toast from "react-hot-toast";
import { IQuestionPaperFile } from "../types/question_paper";
import { isQPValid } from "../utils/validateInput";
import { makeRequest } from "../utils/backend";
import { sanitizeQP } from "../utils/autofillData";
import "./styles/upload_page.scss";
import { UploadForm } from "../components/Upload/UploadForm";

export default function UploadPage() {
    let MAX_UPLOAD_LIMIT = parseInt(import.meta.env.VITE_MAX_UPLOAD_LIMIT);
    if (isNaN(MAX_UPLOAD_LIMIT) || MAX_UPLOAD_LIMIT < 1) {
        MAX_UPLOAD_LIMIT = 10;
    }

    const [uploading, setUploading] = useState(false);

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
                const file_details: {
                    course_code: string,
                    course_name: string,
                    year: number,
                    exam: string,
                    semester: string,
                    filename: string,
                }[] = [];

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

                    file_details.push({
                        course_code,
                        course_name,
                        year,
                        exam,
                        semester,
                        filename: file_name
                    })
                }
                formData.set("file_details", JSON.stringify(file_details));

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
                                `Failed to upload file ${result.filename}: ${result.message}`
                            );
                        }
                    }

                    if (upload_results.length < numPapers) {
                        const failedPapers = numPapers - upload_results.length;
                        toast.error(
                            `${failedPapers} paper${failedPapers > 1 ? "s" : ""
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
                <UploadForm
                    max_upload_limit={MAX_UPLOAD_LIMIT}
                    uploading={uploading}
                    handleUpload={handleUpload}
                />
            </div>
        </div>
    );
}


/*
Screens: DnD screen, Loading Screen, Uploading Screen, Files Screen

DnD Screen: No files + No loading (qPapers.length < 1 && !processing)
Loading Screen: processing selected files (qPapers.length >= 1 && processing)
Uploading Screen: On clicking upload button (qPapers.length >= 1 && uploading)
Files Screen: After processing selected files (qPapers.length >= 1 && !uploading)

Order:
DnD screen -> Loading Screen -> Files Screen -> Uploading Screen -> DnD screen

*/
