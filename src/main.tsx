import { StrictMode, startTransition } from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

// Ensure this only runs in the browser
if (typeof document !== "undefined") {
  const container = document;
  const bootstrap = () => {
    try {
      hydrateRoot(
        container,
        <StrictMode>
          <StartClient />
        </StrictMode>,
      );
    } catch (error) {
      console.error("[Hydration Error]", error);
      // If hydration fails, try a full re-render
      try {
        createRoot(container).render(
          <StrictMode>
            <StartClient />
          </StrictMode>,
        );
      } catch (renderError) {
        console.error("[Render Fallback Error]", renderError);
        // Fallback: reload page if everything fails critically
        if (window.location.search.indexOf("retry=1") === -1) {
          const sep = window.location.search ? "&" : "?";
          window.location.href = window.location.href + sep + "retry=1";
        }
      }
    }
  };

  startTransition(bootstrap);
}


