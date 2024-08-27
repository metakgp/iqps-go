import { Component, createSignal } from "solid-js";
import { IoSearch as SearchIcon, IoLink as ShareIcon } from "solid-icons/io";
import SearchResults from "./SearchResults";
import type { ISearchResult } from "../types/types";
import "../styles/styles.scss";
import { copyLink } from "../utils/copyLink";
import { makeRequest } from "../utils/backend";

const CourseSearchForm: Component=()=> {
  const currentURL = new URL(window.location.toString());

  // Create signals for each form input
  const [courseName, setCourseName] = createSignal(currentURL.searchParams.get('query') ?? "");
  const [exam, setExam] = createSignal(currentURL.searchParams.get('exam') ?? "");
  const [searchResults, setSearchResults] = createSignal<ISearchResult[]>([]);
  const [success, setSuccess] = createSignal<boolean>(false);
  const [awaitingResponse, setAwaitingResponse] = createSignal<boolean>(false);
  const [errMsg, setErrMsg] = createSignal<string>("Search for something.");

  const searchQuery = async () => {
    if (!awaitingResponse()) {
      const params = new URLSearchParams();
      if (courseName()) params.append("course", courseName());
      if (exam()) params.append("exam", exam());

      setAwaitingResponse(true);
      const response = await makeRequest(`search?${params}`, 'get');

      if (response.is_ok) {
        const data: ISearchResult[] = response.response;

        setSearchResults(data); // Handle the response data

        // Show a message if no results are found
        if (data.length === 0) {
          setSuccess(false);
          setErrMsg("No results found. Try another query.");
        } else {
          setSuccess(true);
          setErrMsg("");
        }

        setAwaitingResponse(false);
      } else {
        setSuccess(false);
        setAwaitingResponse(false);
        setErrMsg("Error fetching data. Please try again later.");

        console.error("Error fetching data:", response.response.message);
      }
    }
  }

  // Function to handle form submission
  const handleSubmit = async (event: any) => {
    event.preventDefault(); // Prevent the default form submit action
    await searchQuery(); // Search the query

    // Add the query to the URL
    const url = new URL(window.location.toString());
    url.searchParams.set('query', courseName());
    url.searchParams.set('exam', exam());

    window.history.replaceState(window.history.state, "", url);
  };

  if (courseName() !== '') {
    searchQuery();
  }

  return (
    <div class="search-form">
      <form onSubmit={handleSubmit}>
        <div>
          <label for="course">Course Name:</label>
          <input autofocus={true} id="course" value={courseName()} onInput={(e) => setCourseName(e.target.value)} />
        </div>
        <div>
          <label for="exam">Exam:</label>
          <div class="select-wrapper">
            <select id="exam" value={exam()} onInput={(e) => setExam(e.target.value)}>
              <option value="">Mid / End Semester</option>
              <option value="midsem">Mid Semester</option>
              <option value="endsem">End Semester</option>
            </select>
          </div>
        </div>
        <div class="search-form-btns">
          <button class="icon-btn" type="submit" disabled={awaitingResponse()}>
            Search <SearchIcon />
          </button>
          <button class="icon-btn" onClick={(e) => copyLink(e, window.location.toString())} disabled={awaitingResponse() || !success()}>
            Share Results <ShareIcon />
          </button>
        </div>
      </form>
      <SearchResults
        awaitingResults={awaitingResponse()}
        success={success()}
        errMsg={errMsg()}
        results={searchResults()}
      />
    </div>
  );
}

export default CourseSearchForm;
