import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Fuse from 'fuse.js';

import { validate, validateCourseCode, validateExam, validateSemester, validateYear } from "../../utils/validateInput";
import { Exam, IAdminDashboardQP, IErrorMessage, IQuestionPaperFile, Semester } from "../../types/question_paper";
import { IExtractedDetails } from "../../utils/autofillData";
import './styles/paper_edit_modal.scss';
import { FaArrowLeft, FaArrowRight, FaBan, FaFilePdf } from "react-icons/fa6";
import Spinner from "../Spinner/Spinner";
import { FormGroup, RadioGroup, NumberInput, SuggestionTextInput, ISuggestion } from "./Form";

import COURSE_CODE_MAP from "../../data/courses.json";
import { makeRequest } from "../../utils/backend";
import { IEndpointTypes } from "../../types/backend";
import { useAuthContext } from "../../utils/auth";
import { QPCard } from "../AdminDashboard/QPCard";
import { IoClose } from "react-icons/io5";
import { FaCalendarAlt, FaSync } from "react-icons/fa";

type UpdateQPHandler<T> = (qp: T) => void;
interface IPaperEditModalProps<T> {
	onClose: () => void;
	selectPrev?: (() => void) | null;
	selectNext?: (() => void) | null;
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

	const [courseCodeSuggestions, setCourseCodeSuggestions] = useState<ISuggestion<null>[]>([]);
	const [courseNameSuggestions, setCourseNameSuggestions] = useState<ISuggestion<[course_code: string, course_name: string]>[]>([]);

	// To debounce suggestion generation (which takes time due to fuzzy search)
	const [courseCodeSuggTimeout, setCourseCodeSuggTimeout] = useState<number | null>(null);
	const [courseNameSuggTimeout, setCourseNameSuggTimeout] = useState<number | null>(null);
	const [validityTimeout, setValidityTimeout] = useState<number | null>(null);

	const changeData = <K extends keyof T>(property: K, value: T[K]) => {
		setData((prev_data) => {
			return {
				...prev_data,
				[property]: value
			}
		});
	}

	const debounce = (prevTimeout: number | null, handler: Function, interval = 600) => {
		if (prevTimeout !== null) clearTimeout(prevTimeout);
		return setTimeout(handler, interval);
	}

	// Check for data validity on change
	useEffect(() => {
		setValidityTimeout(debounce(
			validityTimeout,
			() => {
				const errors = validate(data);

				setValidationErrors(errors);
				setIsDataValid(Object.values(errors).every((err) => err === null));
			},
			400
		))
	}, [data]);

	useEffect(() => {
		setData(props.qPaper);
	}, [props.qPaper])

	// Automatically fill the course name if course code matches
	useEffect(() => {
		if (data.course_code.length === 7) {
			if (data.course_code in COURSE_CODE_MAP) {
				changeData('course_name', COURSE_CODE_MAP[data.course_code as keyof typeof COURSE_CODE_MAP]);
				setCourseCodeSuggestions([]);
			}
		}
	}, [data.course_code])

	const getSimilarPapers = async (details: IEndpointTypes['similar']['request'], currentPaperId: number) => {
		setAwaitingSimilarPapers(true);
		const response = await makeRequest('similar', 'get', details, auth.jwt);

		if (response.status === "success") {
			setSimilarPapers(response.data.filter((paper) => paper.id !== currentPaperId));
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
				if (validateExam(data.exam) && data.exam !== '' && data.exam !== 'ct') similarityDetails['exam'] = data.exam;
				if (validateSemester(data.semester)) similarityDetails['semester'] = data.semester;

				getSimilarPapers(similarityDetails, 'id' in data ? data.id : -1);
			}

		}, [data.course_code, data.year, data.exam, data.semester])
	}

	const courseCodeNameMap = Object.entries(COURSE_CODE_MAP);

	const courseNamesFuse = new Fuse(courseCodeNameMap, {
		isCaseSensitive: false,
		minMatchCharLength: 3,
		ignoreLocation: true,
		keys: ['1']
	})

	useEffect(() => {
		setCourseCodeSuggTimeout(debounce(
			courseCodeSuggTimeout,
			() => setCourseCodeSuggestions(
				trimSuggestions(
					courseCodeNameMap.filter(([code]) => code.startsWith(data.course_code))
				)
					.map(([code]) => {
						return { displayValue: code, context: null }
					})
			)
		))
	}, [data.course_code])

	useEffect(() => {
		if (data.course_name.length > 3) {
			setCourseNameSuggTimeout(debounce(
				courseNameSuggTimeout,
				() => setCourseNameSuggestions(
					trimSuggestions(
						courseNamesFuse.search(data.course_name).map((result) => result.item)
					).map(([course_code, course_name]: [string, string]) => {
						return {
							displayValue: `${course_name} (${course_code})`,
							context: [course_code, course_name]
						}
					})
				)
			))
		} else {
			setCourseNameSuggestions([])
			if (courseNameSuggTimeout) {
				clearTimeout(courseNameSuggTimeout)
				setCourseCodeSuggTimeout(null)
			}
		}
	}, [data.course_name])

	const trimSuggestions = (results: any[]) => {
		if (results.length < 2) return [];
		else return results.slice(0, 5);
	}

	return <div className="modal-overlay">
		{'filelink' in data &&
			<div className="modal qp-preview" style={{ minWidth: '20%' }}>
				<h2>Preview</h2>
				<embed src={data.filelink} />
				{/* <h2>OCR Details</h2>
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
				} */}
			</div>
		}
		<div className="modal">
			<button
				className="close-btn"
				onClick={(e) => {
					e.preventDefault();
					props.onClose();
				}}
			>
				<IoClose size="1.4rem" />
			</button>
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
							value={data.course_code.toLowerCase() === 'unknown course' ? '' : data.course_code}
							placeholder={data.course_code.length > 0 ? data.course_code : 'Enter course code'}
							onValueChange={(value) => changeData('course_code', value.toUpperCase())}
							suggestions={courseCodeSuggestions}
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
						value={data.course_name.toLowerCase() === 'unknown course' ? '' : data.course_name}
						placeholder={data.course_name.length > 0 ? data.course_name : 'Enter course name'}
						onValueChange={(value) => changeData('course_name', value.toUpperCase())}
						suggestions={courseNameSuggestions}
						onSuggestionSelect={({ context: [course_code, course_name] }) => {
							changeData('course_name', course_name)
							changeData('course_code', course_code)
						}}
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
						value={data.semester as Semester}
						onSelect={(value: Semester) => changeData('semester', value)}
					/>
				</FormGroup>
				<FormGroup
					label="Additional Note:"
					validationError={null}
				>
					<div className="additional-note">
						<div className="note-options">
							<button
								className={`note-option none ${data.note === '' ? 'enabled' : ''}`}
								onClick={(e) => {
									e.preventDefault();
									changeData('note', '');
								}}
							>
								<FaBan />	None
							</button>
							<button
								className={`note-option ${data.note === 'Supplementary' ? 'enabled' : ''}`}
								onClick={(e) => {
									e.preventDefault();
									changeData('note', 'Supplementary');
								}}
							>
								<FaSync /> Supplementary Exam
							</button>
							<button
								className={`note-option ${data.note.match(/^Slot [A-Z]$/) !== null ? 'enabled' : ''}`}
								onClick={(e) => {
									e.preventDefault();
									changeData('note', 'Slot A');
								}}
							>
								<FaCalendarAlt /> Multiple Slots
							</button>
						</div>
						<div className="note-customize">
							{
								data.note.match(/^Slot [A-Z]$/) &&
								<div>
									<label>Slot:</label>
									<NumberInput
										alphabetical={true}
										value={data.note.charCodeAt(data.note.length - 1)}
										setValue={(value) => {
											console.log('changing', value, String.fromCharCode(value))
											changeData('note', `Slot ${String.fromCharCode(value)}`)
										}
										}
									/>
								</div>
							}
							{
								'approve_status' in data &&
								<div>
									<label>Custom Note:</label>
									<SuggestionTextInput
										placeholder="Custom Note"
										value={data.note}
										onValueChange={(value) => changeData('note', value)}
										suggestions={[]}
									/>
								</div>
							}
						</div>
					</div>
				</FormGroup>

				{
					'approve_status' in data &&

					<FormGroup label="Approval Status:">
						<div className="approve-status">
							<button
								className="approve-btn"
								disabled={data.approve_status}
								onClick={(e) => {
									e.preventDefault();
									changeData('approve_status' as keyof T, true as T[keyof T]);
								}}
							>Approved
							</button>
							<button
								className="unapprove-btn"
								disabled={!data.approve_status}
								onClick={(e) => {
									e.preventDefault();
									changeData('approve_status' as keyof T, false as T[keyof T]);
								}}
							>Unapproved
							</button>
						</div>
					</FormGroup>
				}

				<div className="control-group">
					{
						props.selectPrev !== undefined &&
						<button
							onClick={(e) => {
								e.preventDefault();
								props.selectPrev!();
							}}
							className="prev-btn"
							disabled={props.selectPrev === null}
						>
							<FaArrowLeft />
						</button>
					}

					{!('filelink' in data) &&
						<button
							onClick={(e) => {
								e.preventDefault();
								props.onClose();
							}}
							className="cancel-btn"
						>
							Cancel
						</button>
					}
					<button
						onClick={(e) => {
							e.preventDefault();
							if (!('approve_status' in data)) {
								toast.success("File details updated successfully");
							}
							props.updateQPaper(data);
						}}
						disabled={!isDataValid}
						className="save-btn"
					>
						{'approve_status' in data ? 'Update Details' : 'Save'}
					</button>

					{
						props.selectNext !== undefined &&
						<button
							onClick={(e) => {
								e.preventDefault();
								props.selectNext!();
							}}
							className="next-btn"
							disabled={props.selectNext === null}
						>
							<FaArrowRight />
						</button>
					}
				</div>
			</form>
		</div>
		{
			'filelink' in data &&
			<>
				<div className="modal" style={{ minWidth: '20%' }}>
					<h2>Similar Papers</h2>
					{
						awaitingSimilarPapers ? <div style={{ justifyContent: 'center', display: 'flex' }}><Spinner /></div> :
							<div>
								{
									similarPapers.length === 0 ? <p>No similar papers found.</p> :
										similarPapers.map((paper, i) => <QPCard
											qPaper={paper}
											key={i}
										/>
										)
								}
							</div>
					}
				</div>
			</>
		}
	</div >;
}

export default PaperEditModal;