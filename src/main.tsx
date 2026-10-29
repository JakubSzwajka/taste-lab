import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { captureToken } from "./lib/token";
import "./index.css";
// After the stock tokens, so theme.css wins over them.
import "virtual:taste-lab/theme.css";

// LAN mode: keep the link token, then take it out of the address bar.
const captured = captureToken(location.href, localStorage);
if (captured) history.replaceState(null, "", captured.cleanUrl);

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
