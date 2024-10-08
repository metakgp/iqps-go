import { FaRegTrashAlt } from "react-icons/fa";
import { IAdminDashboardQP } from "../../types/question_paper";
import { isQPValid, validate } from "../../utils/validateInput";
import { FaFilePdf, FaRegPenToSquare } from "react-icons/fa6";

import "./styles/qp_card.scss";
import { formatBackendTimestamp } from "../../utils/backend";

interface IQPCardProps {
    qPaper: IAdminDashboardQP;
    onEdit?: React.MouseEventHandler<HTMLButtonElement>;
    onDelete?: () => void;
    hasOcr?: boolean;
}

export function QPCard({ qPaper, onEdit, onDelete, hasOcr }: IQPCardProps) {
    const errorMsg = validate(qPaper);
    const isValid = isQPValid(qPaper);

    const handleDelete: React.MouseEventHandler<HTMLButtonElement> = (e) => {
        if (onDelete !== undefined) {
            e.preventDefault();

            const first_confirmation = window.confirm(`Are you sure you want to DELETE the paper ${qPaper.course_code} - ${qPaper.course_name}?`);

            if (first_confirmation) {
                let minimum_prompt_time: number = 5; // In seconds

                let num_prompts = 1;
                let prompt_started = new Date().getTime() / 1000;
                let confirmed = window.confirm(`Are you SURE you want to DELETE the paper ${qPaper.course_code} - ${qPaper.course_name}? (Confirm again)`);
                let prompt_ended = new Date().getTime() / 1000;

                while (
                    (prompt_ended - prompt_started < minimum_prompt_time)
                    && confirmed
                ) {
                    prompt_started = new Date().getTime() / 1000;
                    confirmed = window.confirm(
                        num_prompts === 1 ? `At least take 5s to read the prompt. DO YOU WANT TO DELETE THE PAPER ${qPaper.course_code} - ${qPaper.course_name}?` :
                            num_prompts === 2 ? `It takes longer to read a longer message. This is serious. DELETE ${qPaper.course_code} - ${qPaper.course_name}?` :
                                `It's going to take longer each time. You put yourself in this spot. CONFIRM? (${qPaper.course_code} - ${qPaper.course_name})`
                    );
                    prompt_ended = new Date().getTime() / 1000;

                    num_prompts += 1;
                    minimum_prompt_time += num_prompts;
                }

                if (confirmed) {
                    onDelete();
                }
            }
        }
    }

    return (
        <div className={`qp-card ${qPaper.approve_status ? 'approved' : ''}`}>
            <div className="qp-data">
                <div className="course-name">
                    {`${qPaper.course_code} - ${qPaper.course_name}`}
                    <span className="upload-timestamp">({formatBackendTimestamp(qPaper.upload_timestamp)})</span>
                </div>
                <div className="pills">
                    {hasOcr && <div className="pill">OCR</div>}
                    <div className="pill">{qPaper.year}</div>
                    <div className="pill">{qPaper.exam}</div>
                    <div className="pill">{qPaper.semester}</div>
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
                {!qPaper.approve_status && <>
                    {
                        onEdit !== undefined &&
                        <button onClick={onEdit} className="edit-btn btn">
                            <FaRegPenToSquare size="1.5rem" />
                        </button>
                    }
                    {
                        onDelete !== undefined &&
                        <button
                            onClick={handleDelete}
                            className="close-btn btn"
                        >
                            <FaRegTrashAlt size="1.5rem" />
                        </button>
                    }
                </>
                }
            </div>
        </div>
    );
};
