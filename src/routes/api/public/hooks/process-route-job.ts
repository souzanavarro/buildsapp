import { createFileRoute } from "@tanstack/react-router";
import { processRouteJobWithAdmin } from "@/lib/route-jobs.server";

export const Route = createFileRoute("/api/public/hooks/process-route-job")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { job_id?: string } = {};
        try {
          body = (await request.json()) as { job_id?: string };
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const jobId = body.job_id;
        if (!jobId || typeof jobId !== "string") {
          return new Response(JSON.stringify({ error: "job_id obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const result = await processRouteJobWithAdmin(jobId);
          return new Response(JSON.stringify({ success: true, ...result }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ success: false, error: err?.message ?? "erro" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
