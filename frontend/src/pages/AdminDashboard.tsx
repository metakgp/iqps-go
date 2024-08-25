import { Component } from "solid-js";
import { PDFLister } from "../components/PDFTableHead";
import { arr } from "../data/dummyQPs";
import { A, useNavigate } from "@solidjs/router";
import { useAuth } from "../components/AuthProvider";

export const AdminPage: Component = () => {
  const auth = useAuth();

  if (!auth.isAuthenticated()) {
    window.location.assign(`https://github.com/login/oauth/authorize?client_id=${import.meta.env.VITE_GH_OAUTH_CLIENT_ID}`);
  }

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