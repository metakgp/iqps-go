import { Component } from "solid-js";
import { PDFLister } from "../components/PDFTable";
import { arr } from "../data/dummyQPs";

export const AdminPage: Component = () => {
  console.log(arr);
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