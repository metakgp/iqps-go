import type { Component } from "solid-js";
import CourseSearchForm from "./components/searchForm";
import "./styles/styles.scss";

const App: Component = () => {
  return (
    <div class="hero-screen">
      <h1>Course Search</h1>
      <CourseSearchForm />
    </div>
  );
};

export default App;
