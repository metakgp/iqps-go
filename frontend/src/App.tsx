import type { Component } from "solid-js";
import { Toaster } from 'solid-toast';
import CourseSearchForm from "./components/SearchForm";
import "./styles/styles.scss";

const App: Component = () => {
  return (
    <div class="hero-screen">
      <div class="title">
        <h1>IQPS - Intelligent Question Paper Search</h1>
        <p><i>Search for question papers when the library can't save you.</i></p>
        <p>Made with ❤️ and {"</>"} by <a href="https://github.com/metakgp/iqps-go" target="_blank">MetaKGP</a></p>
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
