/* @refresh reload */
import { render } from "solid-js/web";
import { Route, Router } from "@solidjs/router";

import App from "./pages/LandingPage";
import "./styles/styles.scss";

import UploadPage from "./pages/UploadPage";
import { OAuthPage } from "./pages/OAuth";
import { AdminPage } from "./pages/AdminDashboard";
import { AuthProvider } from "./components/AuthProvider";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}


render(() => (
  <>
    <AuthProvider>
      <Router>
        <Route path="/" component={App} />
        <Route path="/upload" component={UploadPage} />
        <Route path="/oauth" component={OAuthPage} />
        <Route path="/admin" component={AdminPage}/>
      </Router>
    </AuthProvider>
    <h3 class="meta-footer">Made with ❤️ and {"</>"} by <a href="https://github.com/metakgp/iqps-go" target="_blank">MetaKGP</a></h3>
  </>
), root!);
