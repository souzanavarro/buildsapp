import { supabase } from "@/integrations/supabase/client";

export async function logErrorToSupabase(params: {
  error: Error | any;
  route?: string;
  userId?: string;
  metadata?: Record<string, any>;
}) {
  const { error, route, userId, metadata } = params;

  // Log to console as well
  console.error("[ErrorLogger]", {
    message: error?.message || "Unknown error",
    route,
    userId,
    stack: error?.stack,
  });

  try {
    const { error: insertError } = await supabase.from("error_logs").insert({
      user_id: userId || null,
      route: route || (typeof window !== "undefined" ? window.location.pathname : null),
      error_message: error?.message || String(error) || "Unknown error",
      stack_trace: error?.stack || null,
      metadata: {
        ...(metadata || {}),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        timestamp: new Date().toISOString(),
      },
    });

    if (insertError) {
      console.warn("[ErrorLogger] Failed to insert log to Supabase:", insertError.message);
    }
  } catch (e) {
    console.warn("[ErrorLogger] Fatal error during logging:", e);
  }
}
