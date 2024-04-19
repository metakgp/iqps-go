import { Component, For, createEffect, createSignal } from "solid-js";
import type { SearchResult } from "../types/types";
import { Spinner } from "./Spinner";

type Props = {
  results: SearchResult[];
  awaitingResults: boolean;
  success: boolean;
  errMsg: string;
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

type SortBy = 'course_name' | 'year';
type SortOrder = 'ascending' | 'descending';

const SearchResults: Component<Props> = (props) => {
  const [displayedResults, setDisplayedResults] = createSignal<SearchResult[]>(props.results);
  const [filterByYear, setFilterByYear] = createSignal<number | null>(null);
  const [sortBy, setSortBy] = createSignal<SortBy>("year");
  const [sortOrder, setSortOrder] = createSignal<SortOrder>("descending");
  const [availableYears, setAvailableYears] = createSignal<number[]>([]);

  createEffect(() => {
    const unique_years: Set<number> = new Set();

    props.results.forEach((result) => unique_years.add(result.year));
    setAvailableYears(Array.from(unique_years.values()));

    updateDisplayedResults();
  })

  const updateDisplayedResults = () => {
    let filtered_results = props.results.slice();
    if (filterByYear() !== null) filtered_results = filtered_results.filter((result) => result.year === filterByYear());

    const sorted_results = filtered_results.sort((a, b) => {
      // Fall back to course name sorting when results are filtered by year.
      const fallback_sorting = sortBy() === 'year' && filterByYear() !== null;

      const sort_by: SortBy = fallback_sorting ? 'course_name' : sortBy();
      const sort_order: SortOrder = fallback_sorting ? 'ascending' : sortOrder();

      const first = sort_order === "ascending" ? a : b;
      const second = sort_order === "ascending" ? b : a;

      switch (sort_by) {
        case "year":
          return first.year - second.year;
        case "course_name":
          return first.course_name.localeCompare(second.course_name);
      }
    });

    setDisplayedResults(sorted_results);
  };

  return (
    <>
      <div class="search-results">
        {
          props.awaitingResults ? <div class="spinner"><Spinner /></div> :
            !props.success ? <p class="error-message">{props.errMsg}</p> : (
              displayedResults().length > 0 && (
                <>
                  <div class="row results-filter">
                    <div class="select-wrapper">
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
                    </div>

                    <div class="select-wrapper">
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
                    </div>

                    <div class="select-wrapper">
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
                            <td>{result.year}</td>
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
              )
            )
        }
      </div>
    </>
  );
};

export default SearchResults;
