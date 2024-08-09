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
          <A href="#" class="admin">IQPS Admin Page</A>
          <A href="/" class="search">Search</A>
          <A href="/upload" class="upload">Upload</A>
          <span class="user">Welcome {user}</span>
        </header>
      </div>
      <div>
        <PDFLister QuestionPapers={arr}/>
      </div>
     </div>
  )
}