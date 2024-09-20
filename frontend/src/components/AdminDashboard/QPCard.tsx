import { FaRegTrashAlt } from "react-icons/fa";
import { IAdminDashboardQP } from "../../types/question_paper";
import { validate } from "../../utils/validateInput";
import { FaFilePdf, FaRegPenToSquare } from "react-icons/fa6";

import "./styles/qp_card.scss";

interface IQPCardProps {
    qPaper: IAdminDashboardQP;
}

export function QPCard({ qPaper }: IQPCardProps) {
    return (
        <div className="qp-card">
            <div className="qp-data">
                <div className="course-name">
                    {`${qPaper.course_code} - ${qPaper.course_name}`}
                </div>
                <div className="pills">
                    <div className="pill">{qPaper.year}</div>
                    <div className="pill">{qPaper.exam}</div>
                    <div className="pill">{qPaper.semester}</div>
                </div>
                { !validate(qPaper) &&
                    <p className="error-msg">Invalid course details</p>
                }
            </div>
            <div className="btn-group">
                <a
                    className="btn"
                    href={qPaper.filelink}
					title="Open PDF"
					target="_blank"
					rel="noopener noreferrer"
                >
                    <FaFilePdf size="1.5rem" />
                </a>
                <button
                    onClick={() => {}}
                    className="close-btn btn"
                >
                    <FaRegTrashAlt size="1.5rem" />
                </button>
                <button onClick={() => {}} className="edit-btn btn">
                    <FaRegPenToSquare size="1.5rem" />
                </button>
            </div>
        </div>
    );
};
