import { Component, createSignal } from "solid-js";
import { PDFLister } from "../components/PDFTableHead";
import { A } from "@solidjs/router";
import { useAuth } from "../components/AuthProvider";
import { IAdminDashboardQP } from "../types/types";
import { makeRequest } from "../utils/backend";
import { arr } from "../data/dummyQPs";

export const AdminPage: Component = () => {
  const auth = useAuth();
  const [unapprovedPapers, setUnapprovedPapers] = createSignal<IAdminDashboardQP[]>(arr);
  const [errMsg, setErrMsg] = createSignal<string | null>(null);

  const fetchUnapprovedPapers = async () => {
    const response = await makeRequest('unapproved', 'get', null, auth.jwt());

    if (response.is_ok) {
      setUnapprovedPapers(response.response);
    } else {
      setErrMsg(`Error fetching papers: ${response.response.message} (${response.status_code})`)
    }
  }

  if (!auth.isAuthenticated()) {
    window.location.assign(`https://github.com/login/oauth/authorize?client_id=${import.meta.env.VITE_GH_OAUTH_CLIENT_ID}`);
  } else {
    fetchUnapprovedPapers();
  }

  return (
    <div class="admin-page">
      <div class="title">
        <header>
          <A href="#" class="admin">IQPS Admin Page</A>
          <A href="/" class="search">Search</A>
          <A href="/upload" class="upload">Upload</A>
          {auth.isAuthenticated() ?
            <span class="user">Welcome Admin!</span> :
            <span class="user">Unauthenticated login attempted. This incident will be reported.</span>
          }
        </header>
      </div>
      {errMsg() !== null && <span class="error">{errMsg()}</span>}
      {
        auth.isAuthenticated() &&
        <div>
          <PDFLister QuestionPapers={unapprovedPapers()} />
        </div>
      }
    </div>
  )
}