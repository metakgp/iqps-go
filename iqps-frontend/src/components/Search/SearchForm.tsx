import { FaSearch } from "react-icons/fa";
import { IoLink } from "react-icons/io5";

import './search_form.scss';
import { createRef, FormEvent, useEffect, useState } from "react";
import { Exam, ISearchResult } from "../../types/question_paper";
import { copyLink } from "../../utils/copyLink";
import { makeRequest } from "../../utils/backend";
import SearchResults from "./SearchResults";

function CourseSearchForm() {
	const currentURL = new URL(window.location.toString());

	const [courseName, setCourseName] = useState<string>(currentURL.searchParams.get('query') ?? '');
	const [exam, setExam] = useState<Exam | ''>(currentURL.searchParams.get('exam') as Exam ?? '');

	const [searchResults, setSearchResults] = useState<ISearchResult[]>([]);
	const [success, setSuccess] = useState<boolean>(false);
	const [awaitingResponse, setAwaitingResponse] = useState<boolean>(false);
	const [msg, setMsg] = useState<string>('Search for something.');

	const courseInputRef = createRef<HTMLInputElement>();
	const examSelectRef = createRef<HTMLSelectElement>();

	const fetchResults = async () => {
		if (!awaitingResponse) {
			const params = new URLSearchParams();
			if (courseName !== '') params.append("course", courseName);
			if (exam !== '') params.append("exam", exam);

			setAwaitingResponse(true);
			const response = await makeRequest(`search?${params}`, 'get');

			if (response.status === 'success') {
				const data: ISearchResult[] = response.data;

				setSearchResults(data); // Handle the response data

				// Show a message if no results are found
				if (data.length === 0) {
					setSuccess(false);
					setMsg("No results found. Try another query.");
				} else {
					setSuccess(true);
					setMsg("");
				}

				setAwaitingResponse(false);
			} else {
				setSuccess(false);
				setAwaitingResponse(false);
				setMsg("Error fetching data. Please try again later.");

				console.error("Error fetching data:", response.message);
			}
		}
	}

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault(); // Prevent the default form submit action
		await fetchResults(); // Search the query

		// Add the query to the URL
		const url = new URL(window.location.toString());
		url.searchParams.set('query', courseName);
		url.searchParams.set('exam', exam);

		window.history.replaceState(window.history.state, "", url);
	}

	// Load results if the link has a query
	useEffect(() => {
		if (courseName !== '') {
			fetchResults();
		}
	}, [])

	return <div className="search-form">
		<form onSubmit={handleSubmit}>
			<div>
				<label htmlFor="course">Course Name:</label>
				<input ref={courseInputRef} autoFocus={true} id="course" value={courseName} onInput={() => setCourseName(courseInputRef.current?.value ?? '')} />
			</div>
			<div>
				<label htmlFor="exam">Exam:</label>
				<div className="select-wrapper">
					<select ref={examSelectRef} id="exam" value={exam} onInput={() => setExam(examSelectRef.current?.value as Exam)}>
						<option value="">Mid / End Semester</option>
						<option value="midsem">Mid Semester</option>
						<option value="endsem">End Semester</option>
					</select>
				</div>
			</div>
			<div className="search-form-btns">
				<button className="icon-btn" type="submit" disabled={awaitingResponse}>
					Search <FaSearch />
				</button>
				<button className="icon-btn" onClick={(e) => copyLink(e, window.location.toString())} disabled={awaitingResponse || !success}>
					Share Results <IoLink />
				</button>
			</div>
		</form>
		<SearchResults
			awaitingResults={awaitingResponse}
			success={success}
			msg={msg}
			results={searchResults}
		/>
	</div>;
}

export default CourseSearchForm;