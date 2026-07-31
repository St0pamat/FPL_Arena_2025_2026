import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@arena/app/App";
import "@arena/styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
