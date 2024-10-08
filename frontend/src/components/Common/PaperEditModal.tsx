import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MdCancel } from "react-icons/md";
import Fuse from 'fuse.js';

import { validate, validateCourseCode, validateExam, validateSemester, validateYear } from "../../utils/validateInput";
import { Exam, IAdminDashboardQP, IErrorMessage, IQuestionPaperFile, Semester } from "../../types/question_paper";
import { getCodeFromCourse, getCourseFromCode, IExtractedDetails } from "../../utils/autofillData";
import './styles/paper_edit_modal.scss';
import { IoMdCheckmarkCircle } from "react-icons/io";
import { FaFilePdf } from "react-icons/fa6";
import Spinner from "../Spinner/Spinner";
import { FormGroup, RadioGroup, NumberInput, SuggestionTextInput } from "./Form";

import COURSE_CODE_MAP from "../../data/courses.json";
import { makeRequest } from "../../utils/backend";
import { IEndpointTypes } from "../../types/backend";
import { useAuthContext } from "../../utils/auth";
import { QPCard } from "../AdminDashboard/QPCard";

type UpdateQPHandler<T> = (qp: T) => void;
interface IPaperEditModalProps<T> {
	onClose: () => void;
	qPaper: T;
	updateQPaper: UpdateQPHandler<T>;
	ocrDetails?: IExtractedDetails;
};

function PaperEditModal<T extends IQuestionPaperFile | IAdminDashboardQP>(props: IPaperEditModalProps<T>) {
	const auth = useAuthContext();

	const [data, setData] = useState(props.qPaper);
	const [validationErrors, setValidationErrors] = useState<IErrorMessage>(validate(props.qPaper));
	const [isDataValid, setIsDataValid] = useState<boolean>(false);

	const [similarPapers, setSimilarPapers] = useState<IAdminDashboardQP[]>([]);
	const [awaitingSimilarPapers, setAwaitingSimilarPapers] = useState<boolean>(false);

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

	// Automatically fill course name if course code changes or vice versa
	useEffect(() => {
		const auto_course_name = getCourseFromCode(data.course_code);

		if (auto_course_name !== null) changeData('course_name', auto_course_name);
	}, [data.course_code]);

	useEffect(() => {
		const auto_course_code = getCodeFromCourse(data.course_name);

		if (auto_course_code !== null) changeData('course_code', auto_course_code);
	}, [data.course_name]);

	const getSimilarPapers = async (details: IEndpointTypes['similar']['request']) => {
		setAwaitingSimilarPapers(true);
		const response = await makeRequest('similar', 'get', details, auth.jwt);

		if (response.status === "success") {
			setSimilarPapers(response.data);
		} else {
			toast.error(`Error getting similar papers: ${response.message} (${response.status_code})`);
		}

		setAwaitingSimilarPapers(false);
	};

	if ('filelink' in props.qPaper) {
		useEffect(() => {
			if (validateCourseCode(data.course_code)) {
				const similarityDetails: IEndpointTypes['similar']['request'] = {
					course_code: data.course_code
				}

				if (validateYear(data.year)) similarityDetails['year'] = data.year;
				if (validateExam(data.exam) && data.exam !== 'unknown' && data.exam !== 'ct') similarityDetails['exam'] = data.exam;
				if (validateSemester(data.semester)) similarityDetails['semester'] = data.semester;

				getSimilarPapers(similarityDetails);
			}

		}, [data.course_code, data.year, data.exam, data.semester])
	}

	const courseCodes = Object.keys(COURSE_CODE_MAP);
	const courseNames = Object.values(COURSE_CODE_MAP);

	const courseNamesFuse = new Fuse(courseNames, {
		isCaseSensitive: false,
		minMatchCharLength: 3,
		ignoreLocation: true
	})

	const trimSuggestions = (results: any[]) => {
		if (results.length < 2) return [];
		else return results.slice(0, 5);
	}

	return <div className="modal-overlay">
		{'filelink' in data &&
			<div className="modal" style={{ minWidth: '20%' }}>
				<h2>OCR Details</h2>
				{
					props.ocrDetails === undefined ?
						<div style={{ justifyContent: 'center', display: 'flex' }}>
							<Spinner />
						</div> :
						<>
							<FormGroup label="Course Code:">
								{props.ocrDetails.course_code ?? "Unknown"}
							</FormGroup>
							<FormGroup label="Year:">
								{props.ocrDetails.year ?? "Unknown"}
							</FormGroup>
							<FormGroup label="Course Name:">
								{getCourseFromCode(props.ocrDetails.course_code ?? "")}
							</FormGroup>
							<FormGroup label="Exam:">
								{props.ocrDetails.exam ?? "Unknown"}
							</FormGroup>
							<FormGroup label="Semester:">
								{props.ocrDetails.semester ?? "Unknown"}
							</FormGroup>
						</>
				}
			</div>
		}
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
				{'filelink' in data &&
					<FormGroup label="File:">
						<a
							href={data.filelink}
							className="pdf-link"
							title="Open PDF"
							target="_blank"
							rel="noopener noreferrer"
						>
							<FaFilePdf size="1.5rem" /> {new URL(data.filelink).pathname.split('/').slice(-1)[0]}
						</a>
					</FormGroup>
				}
				<div className="two-columns">
					<FormGroup
						label="Course Code:"
						validationError={validationErrors.courseCodeErr}
					>
						<SuggestionTextInput
							value={data.course_code}
							onValueChange={(value) => changeData('course_code', value.toUpperCase())}
							suggestions={trimSuggestions(courseCodes.filter((code) => code.startsWith(data.course_code)))}
							inputProps={{ required: true }}
						/>
					</FormGroup>
					<FormGroup
						label="Year:"
						validationError={validationErrors.yearErr}
					>
						<NumberInput
							id="year"
							required
							value={typeof data.year === 'string' ? parseInt(data.year) : data.year}
							setValue={(value) => changeData('year', value)}
						/>
					</FormGroup>
				</div>
				<FormGroup
					label="Course Name:"
					validationError={validationErrors.courseNameErr}
				>
					<SuggestionTextInput
						value={data.course_name}
						onValueChange={(value) => changeData('course_name', value.toUpperCase())}
						suggestions={trimSuggestions(courseNamesFuse.search(data.course_name).map((result) => result.item))}
						inputProps={{ required: true }}
					/>
				</FormGroup>
				<FormGroup
					label="Exam:"
					validationError={validationErrors.examErr}
				>
					<RadioGroup
						options={[
							{ label: 'Mid Semester', value: 'midsem' },
							{ label: 'End Semester', value: 'endsem' },
							{ label: 'Class Test', value: 'ct' }
						]}
						value={data.exam.startsWith('ct') ? 'ct' : data.exam as Exam}
						onSelect={(value: Exam | 'ct') => changeData('exam', value)}
					/>
				</FormGroup>
				{data.exam.startsWith('ct') &&
					<FormGroup
						label="Class Test Number:"
						validationError={validationErrors.examErr}
					>
						<NumberInput
							id="ctnum"
							required
							value={parseInt(data.exam.slice(2))}
							setValue={(value) => changeData('exam', `ct${value}`)}
						/>
					</FormGroup>
				}
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

					<FormGroup label="Approval Status (does nothing rn):">
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
							if (!('approve_status' in data)) {
								toast.success("File details updated successfully");
							}
							props.updateQPaper(data);
							props.onClose();
						}}
						disabled={!isDataValid}
						className={`save-btn ${!isDataValid ? 'disabled' : ''}`}
					>
						{'approve_status' in data ? 'Approve' : 'Save'}
					</button>
				</div>
			</form>
		</div>
		{'filelink' in data &&
			<div className="modal">
				<h2>Similar Papers</h2>
				{
					awaitingSimilarPapers ? <div style={{ justifyContent: 'center', display: 'flex' }}><Spinner /></div> :
						<div>
							{
								similarPapers.length === 0 ? <p>No similar papers found.</p> :
									similarPapers.map((paper, i) => <QPCard
										qPaper={{
											...paper,
											approve_status: true
										}}
										key={i}
									/>
									)
							}
						</div>
				}
			</div>
		}
	</div>;
}

export default PaperEditModal;