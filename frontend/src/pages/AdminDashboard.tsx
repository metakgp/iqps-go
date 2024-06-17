import { Component } from "solid-js";
import { PDFLister } from "../components/PDFTableHead";
import { arr } from "../data/dummyQPs";
import { A } from "@solidjs/router";

export const AdminPage: Component = () => {
  let user = "User";
  
  return (
    <div class="admin-page">
      <div class="title">
        <header>
          <A href="/admin" class="admin">Admin Page</A>
          <A href="/" class="search" target="_blank">Search</A>
          <A href="/upload" class="upload" target="_blank">Upload</A>
          <span class="user">Welcome {user}</span>
        </header>
      </div>
      <div>
        <PDFLister QuestionPapers={arr}/>
      </div>
     </div>
  )
}