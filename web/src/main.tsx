import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles.css";

const appVersion =
  (import.meta.env.VITE_APP_VERSION as string | undefined) ?? (typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev");
console.info(`[GitGud Console] build ${appVersion}`);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

