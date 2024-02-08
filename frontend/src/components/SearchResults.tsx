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
            <p>ID: {result.id}</p>
            <p>Course Name: {result.courseName}</p>
            <p>Course Code: {result.courseCode}</p>
            <p>Year: {result.year}</p>
            <p>Semester: {result.semester}</p>
            <a href={result.fileLink} target="_blank" rel="noopener noreferrer">
              Download File
            </a>
          </div>
        )}
      </For>
    </div>
  );
};

export default SearchResults;
