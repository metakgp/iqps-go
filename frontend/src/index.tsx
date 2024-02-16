/* @refresh reload */
import { render } from "solid-js/web";
import { inject } from "@vercel/analytics";

import App from "./App";
import "./styles/reset.scss";

const root = document.getElementById("root");

inject();

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(() => <App />, root!);
