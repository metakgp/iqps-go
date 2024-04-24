import {
    AiOutlineCloudUpload as UploadIcon,
    AiOutlineFilePdf as PDFIcon,
    AiOutlineDelete as CloseIcon,
} from "solid-icons/ai";
import { Component } from "solid-js";
import { getCourseDetails } from "../utils/courseDetails";

type Props = {
    file: File;
    removeFile: (filename: string) => void;
};

export const FileCard: Component<Props> = ({ file, removeFile }) => {
    const courseDetails = getCourseDetails(file.name);
    return (
        <div class="file-card">
            <PDFIcon size="4.5rem" />
            <div class="file-data">
                <h4 class="file-name">{file.name}</h4>
                <div class="course-name">
                    {`${courseDetails.course_code} - ${courseDetails.course_name}`}
                </div>
                <div class="pills">
                    {courseDetails.year && (
                        <div class="pill">{courseDetails.year}</div>
                    )}
                    {courseDetails.exam && (
                        <div class="pill">{courseDetails.exam}</div>
                    )}
                    {courseDetails.semester && (
                        <div class="pill">{courseDetails.semester}</div>
                    )}
                </div>
            </div>
            <button onClick={() => removeFile(file.name)} class="close-btn">
                <CloseIcon size="2rem" />
            </button>
        </div>
    );
};
