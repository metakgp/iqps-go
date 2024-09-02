import { AiOutlineDelete, AiOutlineFilePdf } from "react-icons/ai";
import { IQuestionPaperFile } from "../../types/question_paper";
import { FaRegPenToSquare } from "react-icons/fa6";
import './file_card.scss';

export interface IFileCardProps {
    qPaper: IQuestionPaperFile;
    removeQPaper: (filename: string) => void;
    edit: (qp: IQuestionPaperFile) => void;
};

export function FileCard({ qPaper, removeQPaper, edit }: IFileCardProps) {
    return (
        <div className="file-card">
            <AiOutlineFilePdf size="4.5rem" />
            <div className="file-data">
                <h4 className="file-name">{qPaper.file.name}</h4>
                <div className="course-name">
                    {`${qPaper.course_code} - ${qPaper.course_name}`}
                </div>
                <div className="pills">
                    <div className="pill">{qPaper.year}</div>
                    <div className="pill">{qPaper.exam}</div>
                    <div className="pill">{qPaper.semester}</div>
                </div>
            </div>
            <div className="btn-group">
                <button
                    onClick={() => removeQPaper(qPaper.file.name)}
                    className="close-btn"
                >
                    <AiOutlineDelete size="2rem" />
                </button>
                <button onClick={() => edit(qPaper)} className="edit-btn">
                    <FaRegPenToSquare size="1.5rem" />
                </button>
            </div>
        </div>
    );
};
