/* @refresh reload */
import { render } from "solid-js/web";
import { Route, Router } from "@solidjs/router";
import { inject } from "@vercel/analytics";

import App from "./pages/LandingPage";
import "./styles/styles.scss";

import UploadPage from "./pages/UploadPage";

const root = document.getElementById("root");

inject();

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}


render(() => (
  <Router>
    <Route path="/" component={App} />
    <Route path="/upload" component={UploadPage} />
  </Router>
), root!);
