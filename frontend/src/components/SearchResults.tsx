import { Component, For, createSignal, onMount } from "solid-js";
import type { SearchResult } from "../types/types";

type Props = {
  results: SearchResult[];
};

const examMap = (exam: string) => {
  switch (exam) {
    case 'midsem': return 'Mid Semester';
    case 'endsem': return 'End Semester';
    default: return 'Unknown';
  }
}

const SearchResults: Component<Props> = (props) => {
  const [displayedResults, setDisplayedResults] = createSignal<SearchResult[]>(props.results);
  const [filterByYear, setFilterByYear] = createSignal<number | null>(null);
  const [availableYears, setAvailableYears] = createSignal<number[]>([]);

  onMount(() => {
    const unique_years: Set<number> = new Set();
    props.results.forEach((result) => unique_years.add(result.year));
    setAvailableYears(Array.from(unique_years.values()));
  })

  const updateDisplayedResults = () => {
    let filtered_results = props.results.slice();
    if (filterByYear() !== null) filtered_results = filtered_results.filter((result) => result.year === filterByYear());

    const sorted_results = filtered_results.sort((a, b) => b.year - a.year);
    setDisplayedResults(sorted_results);
  }

  updateDisplayedResults();
  return (
    <div class="search-results">
      {
        displayedResults().length > 0 && (
          <>
            <div class="row">
              Filter by year:
              <select id="year" value={filterByYear()?.toString()} onInput={(e) => {
                setFilterByYear(e.target.value === "null" ? null : parseInt(e.target.value));
                updateDisplayedResults();
              }}>
                <option value="null">Select a year</option>
                <For each={availableYears()}>
                    {(year) => (
                      <option value={year.toString()}>{year}</option>
                    )}
                  </For>
              </select>
            </div>

            <table class="search-results-table">
              <thead>
                <tr>
                  <th>Course Name</th>
                  <th>Year</th>
                  <th>Exam</th>
                </tr>
              </thead>
              <For each={displayedResults()}>
                {(result) => (
                  <tr class="result-card">
                    <td>
                      {decodeURIComponent(result.course_name)} &nbsp;
                      [<a href={result.filelink} target="_blank" rel="noopener noreferrer">
                        PDF
                      </a>]
                    </td>
                    <td>{result.year}</td>
                    <td>{examMap(result.exam)}</td>
                  </tr>
                )}
              </For>
            </table>
          </>
        )
      }
    </div>
  );
};

export default SearchResults;
