import { Component, createSignal } from "solid-js";
import { PDFLister } from "../components/PDFTableHead";
import { A } from "@solidjs/router";
import { useAuth } from "../components/AuthProvider";
import { IAdminDashboardQP } from "../types/question_paper";
import { makeRequest } from "../utils/backend";
import { Spinner } from "../components/Spinner";

export const AdminPage: Component = () => {
  const auth = useAuth();
  const [fetchStatus, setFetchStatus] = createSignal<"fetched" | "awaiting" | "error" | "not fetched">("not fetched");
  const [unapprovedPapers, setUnapprovedPapers] = createSignal<IAdminDashboardQP[]>([]);
  const [errMsg, setErrMsg] = createSignal<string | null>(null);

  const fetchUnapprovedPapers = async () => {
    setFetchStatus("awaiting");
    const response = await makeRequest('unapproved', 'get', null, auth.jwt());

    if (response.status === 'success') {
      setUnapprovedPapers(response.data);
      setFetchStatus("fetched");
    } else {
      setErrMsg(`Error fetching papers: ${response.message} (Status code: ${response.status_code})`);
      setFetchStatus("error");
    }
  }

  if (!auth.isAuthenticated()) {
    window.location.assign(`https://github.com/login/oauth/authorize?client_id=${import.meta.env.VITE_GH_OAUTH_CLIENT_ID}`);
  } else {
    fetchUnapprovedPapers();
  }

  return (
    <>
      {auth.isAuthenticated() &&
        <div class="admin-page">
          <div class="title">
            <header>
              <A href="#" class="admin">IQPS Admin Page</A>
              <A href="/" class="search">Search</A>
              <A href="/upload" class="upload">Upload</A>
              <span class="user">Welcome Admin!</span>
            </header>
          </div>
          {errMsg() !== null && <span class="error">{errMsg()}</span>}
          {fetchStatus() === "awaiting" && <div class="spinner"><Spinner /></div>}
          {
            fetchStatus() === "fetched" && (
              unapprovedPapers().length > 0 ?
                <div>
                  <PDFLister QuestionPapers={unapprovedPapers()} />
                </div> :
                <p>No unapproved papers left.</p>
            )
          }
        </div>
      }
    </>
  )
}