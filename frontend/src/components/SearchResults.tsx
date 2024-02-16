import { Component, For, createSignal, onMount } from "solid-js";
import { FiDownload as DownloadIcon, FiFilter as FilterIcon } from "solid-icons/fi";
import type { SearchResult } from "../types/types";

type Props = {
  results: SearchResult[];
};

const examMap = (exam: string) => {
  switch (exam) {
    case "midsem":
      return "Mid Semester";
    case "endsem":
      return "End Semester";
    default:
      return "Unknown";
  }
};

const SearchResults: Component<Props> = (props) => {
  const [displayedResults, setDisplayedResults] = createSignal<SearchResult[]>(props.results);
  const [filterByYear, setFilterByYear] = createSignal<number | null>(null);
  const [sortBy, setSortBy] = createSignal<"course_name" | "year">("year");
  const [sortOrder, setSortOrder] = createSignal<"ascending" | "descending">("descending");
  const [availableYears, setAvailableYears] = createSignal<number[]>([]);

  onMount(() => {
    const unique_years: Set<number> = new Set();
    props.results.forEach((result) => unique_years.add(result.year));
    setAvailableYears(Array.from(unique_years.values()));
  });

  const updateDisplayedResults = () => {
    let filtered_results = props.results.slice();
    if (filterByYear() !== null) filtered_results = filtered_results.filter((result) => result.year === filterByYear());

    const sorted_results = filtered_results.sort((a, b) => {
      const first = sortOrder() === "ascending" ? a : b;
      const second = sortOrder() === "ascending" ? b : a;

      switch (sortBy()) {
        case "year":
          return first.year - second.year;
        case "course_name":
          return first.course_name.localeCompare(second.course_name);
      }
    });
    setDisplayedResults(sorted_results);
  };

  updateDisplayedResults();
  return (
    <div class="search-results">
      {displayedResults().length > 0 && (
        <>
          <div class="row results-filter">
            {/* <FilterIcon size={'1.5rem'} /> */}
            <select
              id="year"
              value={(filterByYear() ?? "null").toString()}
              onInput={(e) => {
                setFilterByYear(e.target.value === "null" ? null : parseInt(e.target.value));
                updateDisplayedResults();
              }}
            >
              <option value="null">All Years</option>
              <For each={availableYears()}>{(year) => <option value={year.toString()}>{year}</option>}</For>
            </select>

            <select
              id="sortBy"
              value={sortBy()}
              onInput={(e) => {
                setSortBy(e.target.value as "course_name" | "year");
                updateDisplayedResults();
              }}
            >
              <option value="year">Sort by Year</option>
              <option value="course_name">Sort by Course Name</option>
            </select>

            <select
              id="sortOrder"
              value={sortOrder()}
              onInput={(e) => {
                setSortOrder(e.target.value as "ascending" | "descending");
                updateDisplayedResults();
              }}
            >
              <option value="ascending">Ascending</option>
              <option value="descending">Descending</option>
            </select>
          </div>

          <table class="search-results-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Course Name</th>
                <th>Exam</th>
              </tr>
            </thead>
            <tbody>
              <For each={displayedResults()}>
                {(result) => (
                  <tr class="result-card">
                    <td>
                      {/* <span class="download-btn-container"> */}
                      {/* <a class="download-btn" href={result.filelink} target="_blank" rel="noopener noreferrer">
                          <DownloadIcon />
                        </a> */}
                      {result.year}
                      {/* </span> */}
                    </td>
                    <td>
                      {decodeURIComponent(result.course_name).replaceAll("_", " ")} &nbsp; [
                      <a
                        class="download-btn"
                        style={{ display: "inline-flex", gap: "5px", "align-items": "center" }}
                        href={result.filelink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        PDF
                      </a>
                      ]
                    </td>
                    <td>{examMap(result.exam)}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default SearchResults;
