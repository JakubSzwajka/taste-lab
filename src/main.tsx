import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Chrome stays independent of the served app. The virtual sheet resets previews.
import "./lab-theme.css";
import "virtual:taste-lab/theme.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
