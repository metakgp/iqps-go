import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MdCancel } from "react-icons/md";

import { validate } from "../../utils/validateInput";
import { Exam, IAdminDashboardQP, IErrorMessage, IQuestionPaperFile, Semester } from "../../types/question_paper";
import { getCourseFromCode } from "../../utils/autofillData";
import './styles/paper_edit_modal.scss';
import { IoMdCheckmarkCircle } from "react-icons/io";

type UpdateQPHandler<T> = (qp: T) => void;
interface IPaperEditModalProps<T> {
	onClose: () => void;
	qPaper: T;
	updateQPaper: UpdateQPHandler<T>;
};

function PaperEditModal<T extends IQuestionPaperFile | IAdminDashboardQP>(props: IPaperEditModalProps<T>) {
	const [data, setData] = useState(props.qPaper);
	const [validationErrors, setValidationErrors] = useState<IErrorMessage>(validate(props.qPaper));
	const [isDataValid, setIsDataValid] = useState<boolean>(false);

	const changeData = <K extends keyof T>(property: K, value: T[K]) => {
		setData((prev_data) => {
			return {
				...prev_data,
				[property]: value
			}
		});
	}

	// Check for data validity on change
	useEffect(() => {
		const errors = validate(data);

		setValidationErrors(errors);
		setIsDataValid(Object.values(errors).every((err) => err === null));
	}, [validationErrors, isDataValid]);

	// Automatically fill course name if course code changes
	useEffect(() => {
		if (data.course_code.length === 7) {
			const course_name = getCourseFromCode(data.course_code);

			if (course_name !== null) changeData('course_name', course_name);
		}
	}, [data]);

	return <div className="modal-overlay">
		<div className="modal">
			<form>
				<h2>Edit Course Details</h2>
				{'file' in data &&
					<FormGroup label="Filename:">
						<input
							type="text"
							id="filename"
							required
							value={data.file.name}
							disabled
						/>
					</FormGroup>
				}
				<div className="two-columns">
					<FormGroup
						label="Course Code:"
						validationError={validationErrors.courseCodeErr}
					>
						<input
							type="text"
							id="course_code"
							required
							value={data.course_code}
							onInput={(e) => changeData('course_code', e.currentTarget.value)}
						/>
					</FormGroup>
					<FormGroup
						label="Year:"
						validationError={validationErrors.yearErr}
					>
						<input
							type="number"
							id="year"
							required
							value={data.year}
							onInput={(e) => changeData('year', parseInt(e.currentTarget.value))}
						/>
					</FormGroup>
				</div>
				<FormGroup
					label="Course Name:"
					validationError={validationErrors.courseNameErr}
				>
					<input
						type="text"
						id="course_name"
						required
						value={data.course_name}
						onInput={(e) => changeData('course_name', e.currentTarget.value)}
					/>
				</FormGroup>
				<FormGroup
					label="Exam:"
					validationError={validationErrors.examErr}
				>
					<RadioGroup
						options={[
							{ label: 'Mid Semester', value: 'midsem' },
							{ label: 'End Semester', value: 'endsem' }
						]}
						value={data.exam as Exam}
						onSelect={(value: Exam) => changeData('exam', value)}
					/>
				</FormGroup>
				<FormGroup
					label="Semester:"
					validationError={validationErrors.semesterErr}
				>
					<RadioGroup
						options={[
							{ label: 'Autumn Semester', value: 'autumn' },
							{ label: 'Spring Semester', value: 'spring' }
						]}
						value={data.semester}
						onSelect={(value: Semester) => changeData('semester', value)}
					/>
				</FormGroup>

				{
					'approve_status' in data &&

					<FormGroup
						label="Approval Status:"
						validationError={null}
					>
						<button
							className={`btn approve-btn ${data.approve_status ? 'approved' : 'unapproved'}`}
							onClick={(e) => {
								e.preventDefault();
								changeData('approve_status' as keyof T, !data.approve_status as T[keyof T]);
							}}
						>
						{data.approve_status ? <IoMdCheckmarkCircle /> : <MdCancel size="1.1rem" />} {data.approve_status ? 'APPROVED' : 'UNAPPROVED'}
						</button>
					</FormGroup>
				}

				<div className="control-group">
					<button
						onClick={(e) => {
							e.preventDefault();
							props.onClose();
						}}
						className="cancel-btn"
					>
						Cancel
					</button>
					<button
						onClick={(e) => {
							e.preventDefault();
							toast.success("File details updated successfully");
							props.updateQPaper(data);
							props.onClose();
						}}
						disabled={!isDataValid}
						className={`save-btn ${!isDataValid ? 'disabled' : ''}`}
					>
						Save
					</button>
				</div>
			</form>
		</div>
	</div>;
}

interface IFormGroupProps {
	label: string;
	children: React.ReactNode;
	validationError?: string | null;
}
function FormGroup(props: IFormGroupProps) {
	return <div className="form-group">
		<label>{props.label}</label>
		<div>
			{props.children}
			{props.validationError && (
				<p className="error-msg">
					{props.validationError}
				</p>
			)}
		</div>
	</div>
}

interface IRadioGroupProps<T> {
	value: T;
	options: {
		label: string;
		value: T;
	}[];
	onSelect: (value: T) => void;
}
function RadioGroup<T>(props: IRadioGroupProps<T>) {
	return <div className="radio-group">
		{
			props.options.map(({ label, value }, i) => {
				return <label key={i}>
					<input
						type="radio"
						checked={props.value === value}
						onChange={(e) => e.currentTarget.checked && props.onSelect(value)}
					/>
					{label}
				</label>
			})
		}
	</div>
}

export default PaperEditModal;