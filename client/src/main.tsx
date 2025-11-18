import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

declare global {
  interface Window {
    toggleContrastDebug?: () => void;
  }
}

const rootEl = document.getElementById("root")!;

const applyContrastClass = (enabled: boolean) => {
  document.body.classList.toggle("contrast-debug", enabled);
};

const savedPreference = localStorage.getItem("contrast-debug") === "on";
applyContrastClass(savedPreference);

const toggleDebug = () => {
  const next = !document.body.classList.contains("contrast-debug");
  applyContrastClass(next);
  localStorage.setItem("contrast-debug", next ? "on" : "off");
};

window.toggleContrastDebug = toggleDebug;

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "c") {
    event.preventDefault();
    toggleDebug();
  }
});

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.warn("Service worker registration failed", error);
  });
}

