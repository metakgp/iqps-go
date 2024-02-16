import { Component, For } from "solid-js";
import type { SearchResult } from "../types/types";

type Props = {
  results: SearchResult[];
  noResultsFound: boolean;
};

const examMap = (exam: string) => {
  switch (exam) {
    case 'midsem': return 'Mid Semester';
    case 'endsem': return 'End Semester';
    default: return 'Unknown';
  }
}

const SearchResults: Component<Props> = (props) => {
  return (
    <div class="search-results">
      {
        props.noResultsFound ? <p>No results found. Try a different query.</p> :
        props.results.length > 0 &&
        <table class="search-results-table">
          <thead>
            <tr>
              <th>Course Name</th>
              <th>Year</th>
              <th>Exam</th>
            </tr>
          </thead>
          <For each={props.results.sort((a, b) => b.year - a.year)}>
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
      }
    </div>
  );
};

export default SearchResults;
