import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Catch any initialization errors, especially on mobile devices
try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
        throw new Error("Root element not found");
    }
    createRoot(rootElement).render(<App />);
} catch (error) {
    console.error("Failed to initialize app:", error);
    // Display error message for debugging
    const rootElement = document.getElementById("root");
    if (rootElement) {
        rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; background: #fee; color: #c00;">
        <h2>Failed to load application</h2>
        <p>Error: ${error instanceof Error ? error.message : String(error)}</p>
        <p>Please check console for more details.</p>
      </div>
    `;
    }
}
