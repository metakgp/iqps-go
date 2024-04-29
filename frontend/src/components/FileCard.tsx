import {
    AiOutlineFilePdf as PDFIcon,
    AiOutlineDelete as CloseIcon,
} from "solid-icons/ai";
import { Component } from "solid-js";
import { IQuestionPaperFile } from "../types/types";
import { FaRegularPenToSquare as EditIcon } from "solid-icons/fa";

type Props = {
    qPaper: IQuestionPaperFile;
    removeQPaper: (filename: string) => void;
    edit: (qp: IQuestionPaperFile) => void;
};

export const FileCard: Component<Props> = ({ qPaper, removeQPaper, edit }) => {
    return (
        <div class="file-card">
            <PDFIcon size="4.5rem" />
            <div class="file-data">
                <h4 class="file-name">{qPaper.file.name}</h4>
                <div class="course-name">
                    {`${qPaper.course_code} - ${qPaper.course_name}`}
                </div>
                <div class="pills">
                    <div class="pill">{qPaper.year}</div>
                    <div class="pill">{qPaper.exam}</div>
                    <div class="pill">{qPaper.semester}</div>
                </div>
            </div>
            <div class="btn-group">
                <button
                    onClick={() => removeQPaper(qPaper.file.name)}
                    class="close-btn"
                >
                    <CloseIcon size="2rem" />
                </button>
                <button onClick={() => edit(qPaper)} class="edit-btn">
                    <EditIcon size="1.5rem" />
                </button>
            </div>
        </div>
    );
};
