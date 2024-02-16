import type { Component } from "solid-js";
import CourseSearchForm from "./components/searchForm";
import "./styles/styles.scss";

const App: Component = () => {
  return (
    <div class="hero-screen">
      <div class="title">
        <h1>IQPS - Intelligent Question Paper Search</h1>
        <p><i>Search for question papers when the library can't save you.</i></p>
      </div>
      <CourseSearchForm />
    </div>
  );
};

export default App;
