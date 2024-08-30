import { useState } from "react";
import toast from "react-hot-toast";
import { validate } from "../../utils/validateInput";
import { IErrorMessage, IQuestionPaperFile } from "../../types/question_paper";

interface IPaperEditModalProps {
    onClose: () => void;
    qPaper: IQuestionPaperFile;
    updateQPaper: (qp: IQuestionPaperFile) => void;
};
function PaperEditModal(props: IPaperEditModalProps) {
	const [data, setData] = useState(props.qPaper);
	const [validationErrors, setValidationErrors] = useState<IErrorMessage>(validate(props.qPaper));
	const [isDataValid, setIsDataValid] = useState<boolean>(false);

	return <div className="modal-overlay">
		<div className="modal">
			<form className="upload-form">
				<h2>Edit Course Details</h2>
				<div className="form-group">
					<label htmlFor="filename">Filename:</label>
					<input
						type="text"
						id="filename"
						name="filename"
						required
						value={data.file.name}
						disabled
					/>
				</div>
				<div className="two-columns">
					<div className="form-group">
						<label htmlFor="course_code">Course Code:</label>
						<input
							type="text"
							id="course_code"
							name="course_code"
							required
							value={data.course_code}
							onInput={(e) => {
								setData((prev) => {
									return {
										...prev,
										course_code: e.currentTarget.value,
									};
								});
							}}
						/>
						{validationErrors.courseCodeErr !== null && (
							<p className="error-msg">
								{validationErrors.courseCodeErr}
							</p>
						)}
					</div>
					<div className="form-group">
						<label htmlFor="year">Year:</label>
						<select
							id="year"
							name="year"
							required
							value={data.year}
							onChange={(e) => {
								setData((prev) => ({
									...prev,
									year: parseInt(e.target.value),
								}));
							}}
						>
							<option value="">-- Select Year --</option>
							<option value="2024">2024</option>
							<option value="2023">2023</option>
							<option value="2022">2022</option>
							<option value="2021">2021</option>
							<option value="2020">2020</option>
							<option value="2019">2019</option>
						</select>
						{validationErrors.yearErr && (
							<p className="error-msg">{validationErrors.yearErr}</p>
						)}
					</div>
				</div>
				<div className="form-group">
					<label htmlFor="course_name">Course Name:</label>
					<div>
						<input
							type="text"
							id="course_name"
							name="course_name"
							required
							value={data.course_name}
							onInput={(e) => {
								setData((prev) => ({
									...prev,
									course_name: e.currentTarget.value,
								}));
							}}
						/>
						{validationErrors.courseNameErr !== null && (
							<p className="error-msg">
								{validationErrors.courseNameErr}
							</p>
						)}
					</div>
				</div>
				<div className="form-group">
					<label htmlFor="exam">Exam:</label>
					<div className="radio-group">
						<label>
							<input
								type="radio"
								id="exam-mid-semester"
								name="exam"
								value="midsem"
								required
								checked={data.exam == "midsem"}
								onInput={(e) => {
									if (e.currentTarget.checked) {
										setData((prev) => ({
											...prev,
											exam: "midsem",
										}))
									}
								}}
							/>
							Mid Semester
						</label>
						<label>
							<input
								type="radio"
								id="exam-end-semester"
								name="exam"
								value="endsem"
								required
								checked={data.exam == "endsem"}
								onInput={(e) => {
									if (e.currentTarget.checked) {
										setData((prev) => ({
											...prev,
											exam: "endsem",
										}))
									}
								}}
							/>
							End Semester
						</label>
					</div>
					{validationErrors.examErr !== null && (
						<p className="error-msg">{validationErrors.examErr}</p>
					)}
				</div>
				<div className="form-group">
					<label htmlFor="semester">Semester:</label>
					<div className="radio-group">
						<label>
							<input
								type="radio"
								id="semester-autumn"
								name="semester"
								value="autumn"
								required
								checked={data.semester == "autumn"}
								onInput={(e) => {
									if (e.currentTarget.checked) {
										setData((prev) => ({
											...prev,
											semester: "autumn"
										}))
									}
								}}
							/>
							Autumn Semester
						</label>
						<label>
							<input
								type="radio"
								id="semester-spring"
								name="semester"
								value="spring"
								required
								checked={data.semester == "spring"}
								onInput={(e) => {
									if (e.currentTarget.value) {
										setData((prev) => ({
											...prev,
											semester: "spring",
										}))
									}
								}}
							/>
							Spring Semester
						</label>
					</div>
					{validationErrors.semesterErr !== null && (
						<p className="error-msg">{validationErrors.semesterErr}</p>
					)}
				</div>
				<div className="control-group">
					<button
						onClick={(e) => {
							e.preventDefault();
							close();
						}}
						className="cancel-btn"
					>
						Cancel
					</button>
					<button
						onClick={(e) => {
							e.preventDefault();
							toast.success(
								"File details updated successfully"
							);
							props.updateQPaper(data);
							close();
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

export default PaperEditModal;