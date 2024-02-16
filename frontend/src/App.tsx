import type { Component } from "solid-js";
import { Analytics } from "@vercel/analytics/react";
import CourseSearchForm from "./components/searchForm";
import "./styles/styles.scss";

const App: Component = () => {
  return (
    <div class="hero-screen">
      <h1>Course Search</h1>
      <CourseSearchForm />
      <Analytics />
    </div>
  );
};

export default App;
