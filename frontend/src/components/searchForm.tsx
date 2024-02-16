import { createSignal, onMount } from "solid-js";
import SearchResults from "./SearchResults";
import type { SearchResult } from "../types/types";
import "../styles/styles.scss";

function CourseSearchForm() {
  // Create signals for each form input
  const [courseName, setCourseName] = createSignal("");
  const [year, setYear] = createSignal<number>(0);
  const [exam, setExam] = createSignal("");
  const [years, setYears] = createSignal<number[]>([]);
  const [searchResults, setSearchResults] = createSignal<SearchResult[]>([]);
  const [noResultsFound, setNoResultsFound] = createSignal<boolean>(false);

  async function fetchYears() {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/year`);
      const data: { max: number; min: number } = await response.json();
      setYears(Array.from({ length: data.max - data.min + 1 }, (_, i) => data.min + i));
    } catch (error) {
      console.error("Error fetching years:", error);
    }
  }

  onMount(() => {
    fetchYears();
  });

  // Function to handle form submission
  const handleSubmit = async (event: any) => {
    event.preventDefault(); // Prevent the default form submit action

    console.log("Form submitted!", courseName(), year(), exam());

    const params = new URLSearchParams();
    if (courseName()) params.append("course", courseName());
    if (year()) params.append("year", year().toString());
    if (exam()) params.append("exam", exam());

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/search?${params}`, {
        method: "GET", // GET request
      });

      const data: SearchResult[] = await response.json();

      setSearchResults(data); // Handle the response data
      setNoResultsFound(data.length === 0); // Show a message if no results are found
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  return (
    <div class="search-form">
      <form onSubmit={handleSubmit}>
        <div>
          <label for="course">Course Name:</label>
          <input id="course" value={courseName()} onInput={(e) => setCourseName(e.target.value)} />
        </div>
        <div>
          <label for="year">Year:</label>
          <select id="year" name="year" onInput={(e) => setYear(parseInt(e.target.value))}>
            <option value="">Select a year</option>
            {years().map((year) => (
              <option value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div>
          <label for="exam">Exam:</label>
          <select id="exam" value={exam()} onInput={(e) => setExam(e.target.value)}>
            <option value="">Select an exam</option>
            <option value="Mid Sem">Mid Sem</option>
            <option value="End Sem">End Sem</option>
          </select>
        </div>
        <button type="submit">Search</button>
      </form>
      <SearchResults results={searchResults()} noResultsFound={noResultsFound()} />
    </div>
  );
}

export default CourseSearchForm;
