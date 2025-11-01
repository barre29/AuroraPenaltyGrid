import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./ErrorBoundary.tsx";
import "./index.css";

console.log('[main.tsx] Starting app initialization...');

const rootElement = document.getElementById("root");
console.log('[main.tsx] Root element:', rootElement);

if (!rootElement) {
  console.error('[main.tsx] Root element not found!');
} else {
  try {
    console.log('[main.tsx] Creating React root...');
    const root = createRoot(rootElement);
    console.log('[main.tsx] Rendering App...');
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    console.log('[main.tsx] App rendered successfully!');
  } catch (error) {
    console.error('[main.tsx] Error during initialization:', error);
  }
}
