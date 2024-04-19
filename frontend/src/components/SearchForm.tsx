import { createSignal } from "solid-js";
import { IoSearch as SearchIcon } from "solid-icons/io";
import SearchResults from "./SearchResults";
import type { SearchResult } from "../types/types";
import "../styles/styles.scss";

function CourseSearchForm() {
  // Create signals for each form input
  const [courseName, setCourseName] = createSignal("");
  const [exam, setExam] = createSignal("");
  const [searchResults, setSearchResults] = createSignal<SearchResult[]>([]);
  const [success, setSuccess] = createSignal<boolean>(false);
  const [awaitingResponse, setAwaitingResponse] = createSignal<boolean>(false);
  const [errMsg, setErrMsg] = createSignal<string>("Search for something.");

  // Function to handle form submission
  const handleSubmit = async (event: any) => {
    event.preventDefault(); // Prevent the default form submit action

    if (!awaitingResponse()) {
      const params = new URLSearchParams();
      if (courseName()) params.append("course", courseName());
      if (exam()) params.append("exam", exam());

      try {
        setAwaitingResponse(true);
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/search?${params}`, {
          method: "GET", // GET request
        });

        const data: SearchResult[] = await response.json();

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
      } catch (error) {
        setSuccess(false);
        setAwaitingResponse(false);
        setErrMsg("Error fetching data. Please try again later.");

        console.error("Error fetching data:", error);
      }
    }
  };

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
        <button class="icon-btn" type="submit" disabled={awaitingResponse()}>
          Search <SearchIcon />
        </button>
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
