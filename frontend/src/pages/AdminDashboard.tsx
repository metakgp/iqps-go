import { Component, createSignal } from "solid-js";
import { PDFLister } from "../components/PDFTableHead";
import { arr } from "../data/dummyQPs";
import { createStore } from "solid-js/store";
import { IAdminQuestionPaperResult } from "../types/types";

export const AdminPage: Component = () => {
  
  return (
    <div class="admin-page">
      <div class="title">
        <header>
        <h1>IQPS - Admin Dashboard</h1>
        </header>
      </div>
      <div>
        <PDFLister QuestionPapers={arr}/>
      </div>
     </div>
  )
}