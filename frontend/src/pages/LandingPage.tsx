import type { Component } from "solid-js";
import { Toaster } from 'solid-toast';
import { AiOutlineCloudUpload as UploadIcon } from "solid-icons/ai";
import CourseSearchForm from "../components/SearchForm";
import { A } from "@solidjs/router";

const App: Component = () => {
  return (
    <div class="hero-screen">
      <div class="title">
        <h1>IQPS - Intelligent Question Paper Search</h1>
        <p><i>Search for question papers when the library can't save you.</i></p>
        <h3 class="header-upload-encourager">Have old question papers? <A class="header-upload-sender" href="/upload"><UploadIcon size="1.5rem" />Upload!</A></h3>
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
