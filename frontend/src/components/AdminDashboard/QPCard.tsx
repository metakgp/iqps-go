import { FaRegTrashAlt } from "react-icons/fa";
import { IAdminDashboardQP } from "../../types/question_paper";
import { isQPValid, validate } from "../../utils/validateInput";
import { FaFilePdf, FaRegPenToSquare, FaRegSquareCheck, FaRegSquare } from "react-icons/fa6";
import "./styles/qp_card.scss";
import { formatBackendTimestamp } from "../../utils/backend";
import { useState } from "react";

interface IQPCardProps {
    qPaper: IAdminDashboardQP;
    onEdit?: React.MouseEventHandler<HTMLButtonElement>;
    onDelete?: React.MouseEventHandler<HTMLButtonElement>;
    onToggle?: (prev: boolean, event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    hasOcr?: boolean;
}

export function QPCard({ qPaper, onEdit, onDelete, hasOcr, onToggle }: IQPCardProps) {
    const errorMsg = validate(qPaper);
    const isValid = isQPValid(qPaper);

    const [selected, setSelected] = useState<boolean>(false);

    return (
        <div className={`qp-card ${qPaper.approve_status ? 'approved' : ''}`}>
            <div className="qp-data">
                <div className="course-name">
                    {`${qPaper.course_code} - ${qPaper.course_name}`} (id: {qPaper.id})
                    <span className="upload-timestamp">({formatBackendTimestamp(qPaper.upload_timestamp)})</span>
                </div>
                <div className="pills">
                    {hasOcr && <div className="pill">OCR</div>}
                    <div className="pill">{qPaper.year}</div>
                    <div className="pill">{qPaper.exam}</div>
                    <div className="pill">{qPaper.semester}</div>
                    {qPaper.note !== "" && <div className="pill">{qPaper.note}</div>}
                </div>
                {!isValid &&
                    <p className="error-msg">{Object.values(errorMsg).filter((msg) => msg !== null).join(', ')}</p>
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
                {
                    onEdit !== undefined &&
                    <button onClick={onEdit} className="edit-btn btn">
                        <FaRegPenToSquare size="1.5rem" />
                    </button>
                }
                {!qPaper.approve_status && <>
                    {
                        onDelete !== undefined &&
                        <button
                            onClick={onDelete}
                            className="close-btn btn"
                        >
                            <FaRegTrashAlt size="1.5rem" />
                        </button>
                    }
                </>
                }

                {
                    onSelect !== undefined && onUnselect !== undefined &&
                    <div
                        className={`select-btn btn ${selected ? 'selected' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelected(!selected);
                            onToggle(selected, e);
                        }}
                        title={"Replace Paper"}
                    >
                        {selected ? <FaRegSquareCheck size="1.5rem" /> : <FaRegSquare size="1.5rem" />}
                    </div>
                }
            </div>
        </div>
    );
};
