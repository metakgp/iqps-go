import type { Component } from "solid-js";
import { Toaster } from 'solid-toast';
import CourseSearchForm from "../components/SearchForm";
import { A } from "@solidjs/router";

const App: Component = () => {
  return (
    <div class="hero-screen">
      <div class="title">
        <h1>IQPS - Intelligent Question Paper Search</h1>
        <p><i>Search for question papers when the library can't save you.</i></p>
        <h3>Have question papers to upload? <A href="/upload">Click here!</A></h3>
      </div>
      <CourseSearchForm />
      <Toaster toastOptions={{
        position: 'bottom-center',
        className: 'toast'
      }} />
    </div>
  );
};

export default App;
