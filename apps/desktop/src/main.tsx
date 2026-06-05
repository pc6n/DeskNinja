import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { App } from "./App";
import { ContextActionApp } from "./ContextActionApp";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

function Root() {
  const label = getCurrentWindow().label;
  if (label === "action-menu") {
    return <ContextActionApp />;
  }
  return <App />;
}

createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
