import type { Component } from "solid-js";
import CourseSearchForm from "./components/searchForm";
const App: Component = () => {
  return (
    <div>
      <h1>Course Search</h1>
      <CourseSearchForm />
    </div>
  );
};

export default App;
