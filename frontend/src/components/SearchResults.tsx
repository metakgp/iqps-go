import { Component, For } from "solid-js";
import type { SearchResult } from "../types/types";

type Props = {
  results: SearchResult[];
};

const SearchResults: Component<Props> = (props) => {
  return (
    <div class="search-results">
      <For each={props.results}>
        {(result) => (
          <div class="result-card">
            <p>Course Name: {decodeURIComponent(result.course_name)}</p>
            <p>Year: {result.year}</p>
            <p>Semester: {result.exam}</p>
            <a href={result.filelink} target="_blank" rel="noopener noreferrer">
              Download File
            </a>
          </div>
        )}
      </For>
    </div>
  );
};

export default SearchResults;
