import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

const ROUTE_JOB_WAIT_TIMEOUT_MS = 30000;
const ROUTE_JOB_POLL_INTERVAL_MS = 1000;

type RouteJobPayload = {
  name: string;
  source_file_name: string;
  company_id: string;
  user_id: string;
  driver_id: string;
  total_deliveries: number;
  freight_value: number;
  deliveries: Array<Record<string, unknown>>;
  route_date?: string;
  total_rows?: number;
  invalid_rows?: number;
};

export async function enqueueRouteJobWithAdmin(payload: RouteJobPayload) {
  const deliveries = payload.deliveries.map((delivery) => ({
    ...delivery,
    freight_value: Number.isFinite(Number(delivery.freight_value ?? 0)) ? Number(delivery.freight_value ?? 0) : 0,
  })) as Json;

  const { data, error } = await supabaseAdmin
    .from("route_jobs")
    .insert({
      name: payload.name,
      source_file_name: payload.source_file_name,
      company_id: payload.company_id,
      user_id: payload.user_id,
      driver_id: payload.driver_id,
      total_deliveries: payload.total_deliveries,
      freight_value: Number.isFinite(payload.freight_value) ? payload.freight_value : 0,
      deliveries,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Erro ao enfileirar roteiro: ${error?.message || "resposta vazia"}`);
  }

  return { id: data.id as string };
}

export async function processRouteJobWithAdmin(jobId: string) {
  const { data: job, error: loadErr } = await supabaseAdmin
    .from("route_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (loadErr) throw loadErr;
  if (!job) throw new Error(`Job ${jobId} não encontrado`);

  if (job.status === "done" && job.route_id) {
    return { ok: true, route_id: job.route_id as string };
  }

  if (job.status !== "pending") {
    return { skipped: true, status: job.status, route_id: job.route_id ?? null };
  }

  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from("route_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      attempts: (job.attempts ?? 0) + 1,
      progress: 5,
    })
    .eq("id", jobId)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (claimErr) throw claimErr;
  if (!claimed) {
    return { skipped: true, status: "claimed-by-other", route_id: null };
  }

  const jobStart = Date.now();
  const log = (label: string) =>
    console.log(`[process-route-job ${jobId}] [${label}] elapsed=${Date.now() - jobStart}ms`);
  try {
    log("start");
    await supabaseAdmin.from("route_jobs").update({ progress: 25 }).eq("id", jobId);
    log("progress-25");

    const { data: route, error: routeErr } = await supabaseAdmin.rpc("create_route_with_deliveries", {
      p_name: job.name,
      p_source_file_name: job.source_file_name ?? "Importação sem arquivo",
      p_company_id: job.company_id,
      p_user_id: job.user_id,
      p_driver_id: job.driver_id,
      p_total_deliveries: job.total_deliveries,
      p_freight_value: job.freight_value,
      p_deliveries: job.deliveries,
      p_route_date: new Date().toISOString().slice(0, 10),
      p_total_rows: job.total_deliveries,
      p_invalid_rows: 0,
    });
    log(`rpc-done err=${routeErr?.message ?? "none"}`);

    if (routeErr) throw routeErr;
    if (!route?.id) throw new Error("A rota foi criada sem identificador retornado");

    await supabaseAdmin
      .from("route_jobs")
      .update({
        status: "done",
        progress: 100,
        route_id: route.id,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    log(`done route=${route.id}`);

    return { ok: true, route_id: route.id as string };
  } catch (err: any) {
    console.error("[process-route-job] falha", { jobId, err });
    await supabaseAdmin
      .from("route_jobs")
      .update({
        status: "error",
        error_message: err?.message ?? String(err),
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    throw err;
  }
}

export async function waitForRouteJobWithAdmin(jobId: string) {
  const deadline = Date.now() + ROUTE_JOB_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const { data: job, error } = await supabaseAdmin
      .from("route_jobs")
      .select("status, route_id, error_message")
      .eq("id", jobId)
      .maybeSingle();

    if (error) throw error;

    if (job?.status === "error") {
      throw new Error(job.error_message || "Falha ao processar o roteiro no backend.");
    }

    if (job?.route_id) {
      return { id: job.route_id as string };
    }

    await new Promise((resolve) => setTimeout(resolve, ROUTE_JOB_POLL_INTERVAL_MS));
  }

  return null;
}