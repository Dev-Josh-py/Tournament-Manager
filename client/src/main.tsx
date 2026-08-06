import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import type { BeforeSend } from "@vercel/analytics";
import App from "./App";
import "./index.css";

// Mounted here rather than inside App so page views are recorded on the login
// screen too, which App renders from a separate branch.
// `beforeSend` collapses the per-player scorecard paths (/player/1, /player/2, ...)
// into a single route so they aggregate instead of appearing as separate pages.
const collapsePlayerIds: BeforeSend = (event) => ({
  ...event,
  url: event.url.replace(/\/player\/\d+/, "/player/[id]"),
});

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Analytics beforeSend={collapsePlayerIds} />
  </>,
);
