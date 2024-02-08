import type { Component } from "solid-js";
import CourseSearchForm from "./components/searchForm";
const App: Component = () => {
  return (
    <div>
      <div>
        <h1>Course Search</h1>
        <CourseSearchForm />
      </div>
    </div>
  );
};

export default App;
