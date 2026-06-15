// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.
import { logErrorToSupabase } from "./error-logger";

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
  
  // Log critical SDK and hydration errors
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("constructor") || msg.includes("hydrat") || msg.includes("MapTiler")) {
     console.error("[CRITICAL CAPTURE]", error);
  }

  // Forward to Supabase for monitoring
  if (error instanceof Error || (typeof error === 'object' && error !== null)) {
    logErrorToSupabase({
      error: error instanceof Error ? error : new Error(JSON.stringify(error)),
      metadata: { 
        context: "GlobalErrorCapture",
        url: typeof window !== "undefined" ? window.location.href : undefined
      }
    });
  }
}


if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
