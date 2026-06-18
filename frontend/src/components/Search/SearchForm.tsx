import { FaSearch } from "react-icons/fa";
import { IoLink } from "react-icons/io5";

import './search_form.scss';
import { createRef, FormEvent, useEffect, useState } from "react";
import { Exam, ISearchResult } from "../../types/question_paper";
import { copyLink } from "../../utils/copyLink";
import { makeRequest } from "../../utils/backend";
import SearchResults from "./SearchResults";
import { CheckboxGroup } from "../Common/Form";

function CourseSearchForm() {
	const currentURL = new URL(window.location.toString());

	const [query, setQuery] = useState<string>(
		currentURL.searchParams.get('query') ??
		currentURL.searchParams.get('course') ?? // `course` was previously used, keeping for backwards compatibility
		''
	);
	const [examFilter, setExamFilter] = useState<Exam[]>(
		(currentURL.searchParams.get('exam') ?? 'midsem,endsem,ct')
			.split(',') as Exam[]
	);

	const [searchResults, setSearchResults] = useState<ISearchResult[]>([]);
	const [success, setSuccess] = useState<boolean>(false);
	const [awaitingResponse, setAwaitingResponse] = useState<boolean>(false);
	const [msg, setMsg] = useState<string>('Search for something.');

	const courseInputRef = createRef<HTMLInputElement>();

	const fetchResults = async () => {
		if (!awaitingResponse) {
			if (query === '') return;

			setAwaitingResponse(true);
			const response = await makeRequest('search', 'get', { query, exam: examFilter.join(',') });

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
		url.searchParams.set('query', query);
		url.searchParams.set('exam', examFilter.join(','));

		window.history.replaceState(window.history.state, "", url);
	}

	// Load results if the link has a query
	useEffect(() => {
		if (query !== '') {
			fetchResults();
		}
	}, [])

	return <div className="search-form">
		<form onSubmit={handleSubmit}>
			<div>
				<label htmlFor="course">Course Name or Code:</label>
				<input ref={courseInputRef} autoFocus={true} id="course" value={query} onInput={() => setQuery(courseInputRef.current?.value ?? '')} />
			</div>
			<div className="exam-checkbox-group">
				<label htmlFor="exam">Exam:</label>
				<CheckboxGroup<Exam>
					values={examFilter}
					options={[
						{label: 'Midsem', value: 'midsem'},
						{label: 'Endsem', value: 'endsem'},
						{label: 'Class Test', value: 'ct'},
					]}
					onSelect={(value, checked) => setExamFilter((currentValues) => {
						if (checked) return [...currentValues, value];
						else return currentValues.filter((val) => val !== value);
					})}
				/>
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
