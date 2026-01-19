import { render } from "solid-js/web";
import App from "./index";
import "./index.css";

const root = document.getElementById("root");

if (root) {
  render(() => <App />, root);
}
