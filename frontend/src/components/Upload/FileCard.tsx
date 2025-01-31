import { IQuestionPaperFile } from "../../types/question_paper";
import { FaFilePdf, FaRegPenToSquare } from "react-icons/fa6";
import './styles/file_card.scss';
import { FaRegTrashAlt } from "react-icons/fa";
import { UploadFileData } from "./UploadForm";
import Spinner from "../Spinner/Spinner";

export interface IFileCardProps {
    file: UploadFileData;
    removeQPaper: (filename: string) => void;
    edit: (qp: IQuestionPaperFile) => void;
    invalidDetails: boolean;
    runningOcr: boolean;
};

export function FileCard({ file: { qp: qPaper, ocr }, removeQPaper, edit, invalidDetails, runningOcr }: IFileCardProps) {
    return (
        <div className="file-card">
            <div className="file-card-icon">
                <FaFilePdf size="3.5rem" className="file-card-icon" />
            </div>
            <div className="file-data">
                <h4 className="file-name">{qPaper.file.name}</h4>
                {
                    ocr ? <>
                        <div className="course-name">
                            {`${qPaper.course_code} - ${qPaper.course_name}`}
                        </div>
                        <div className="pills">
                            <div className="pill">{qPaper.year}</div>
                            <div className="pill">{qPaper.exam}</div>
                            <div className="pill">{qPaper.semester}</div>
                            {qPaper.note !== "" && <div className="pill">{qPaper.note}</div>}
                        </div>
                        {invalidDetails &&
                            <p className="error-msg">Invalid course details</p>
                        }
                    </> :
                        <p className="processing-msg">{runningOcr ? "Processing file" : "Waiting to process file"} <Spinner /></p>
                }

            </div>
            <div className="btn-group">
                <button
                    onClick={() => removeQPaper(qPaper.file.name)}
                    disabled={runningOcr}
                    className="close-btn btn"
                >
                    <FaRegTrashAlt size="1.5rem" />
                </button>
                <button
                    onClick={() => edit(qPaper)}
                    className="edit-btn btn"
                    disabled={!ocr}
                >
                    <FaRegPenToSquare size="1.5rem" />
                </button>
            </div>
        </div>
    );
};
