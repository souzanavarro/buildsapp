import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseShopeeArrayBuffer } from "./parse-shopee-xlsx";
import { enqueueRouteJobWithAdmin } from "./route-jobs.server";

const IMPORT_CLOCK_SKEW_BUFFER_MS = 2 * 60 * 1000;

type RouteImportPayload = {
  name: string;
  source_file_name: string;
  company_id: string;
  user_id: string;
  driver_id: string;
  route_date?: string;
  total_deliveries: number;
  freight_value: number;
  deliveries?: Array<Record<string, unknown>>;
  stored_file_path?: string;
  total_rows: number;
  invalid_rows: number;
  upload_id?: string;
};

type NormalizedDelivery = Record<string, unknown>;

function normalizeDeliveries(deliveries: Array<Record<string, unknown>>): NormalizedDelivery[] {
  return deliveries.map((d, index) => ({
    at_id: typeof d.at_id === "string" ? d.at_id : null,
    sequence: Number(d.sequence) || index + 1,
    original_sequence: Number(d.original_sequence) || Number(d.sequence) || index + 1,
    stop: d.stop != null ? Number(d.stop) : null,
    spx_tn: typeof d.spx_tn === "string" ? d.spx_tn : null,
    destination_address: typeof d.destination_address === "string" && d.destination_address.trim()
      ? d.destination_address
      : "Endereço não informado",
    neighborhood: typeof d.neighborhood === "string" ? d.neighborhood : null,
    city: typeof d.city === "string" ? d.city : null,
    zipcode: typeof d.zipcode === "string" ? d.zipcode : null,
    latitude: d.latitude == null ? null : Number(d.latitude),
    longitude: d.longitude == null ? null : Number(d.longitude),
    freight_value: d.freight_value == null ? 0 : Number(d.freight_value) || 0,
    status: d.status ?? "pending",
  }));
}

async function loadDeliveriesFromStoredFile(data: RouteImportPayload, importId: string, stage: (label: string) => void) {
  if (!data.stored_file_path) {
    throw new Error("Arquivo da planilha não foi enviado ao backend.");
  }

  stage(`storage-download path=${data.stored_file_path}`);
  const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
    .from("route-files")
    .download(data.stored_file_path);

  if (downloadError || !fileBlob) {
    throw new Error(`Falha ao baixar planilha salva (${downloadError?.message ?? "sem arquivo"}).`);
  }

  stage(`storage-downloaded size=${fileBlob.size}`);
  const parsed = await parseShopeeArrayBuffer(await fileBlob.arrayBuffer());
  stage(`xlsx-parsed valid=${parsed.valid.length} invalid=${parsed.invalid}`);

  if (!parsed.valid.length) {
    throw new Error("A planilha salva não possui entregas válidas para importar.");
  }

  const normalized: NormalizedDelivery[] = parsed.valid.map((d, index) => ({
    at_id: d.at_id,
    sequence: d.sequence || index + 1,
    original_sequence: d.sequence || index + 1,
    stop: d.stop,
    spx_tn: d.spx_tn,
    destination_address: d.destination_address || "Endereço não informado",
    neighborhood: d.neighborhood,
    city: d.city,
    zipcode: d.zipcode,
    latitude: d.latitude,
    longitude: d.longitude,
    freight_value: d.freight_value ?? 0,
    status: "pending",
  }));

  console.log(`[Import-${importId}] arquivo reprocessado no backend com ${normalized.length} entregas`);
  return {
    deliveries: normalized as Array<Record<string, unknown>>,
    totalDeliveries: normalized.length,
    totalRows: parsed.total,
    invalidRows: parsed.invalid,
  };
}

export async function createRouteImportWithAdmin(data: RouteImportPayload) {
  const startTime = Date.now();
  const importId = data.upload_id || Math.random().toString(36).substring(2, 10);
  const stage = (label: string) =>
    console.log(`[Import-${importId}] [${label}] elapsed=${Date.now() - startTime}ms`);
  console.log(`[Import-${importId}] start file="${data.source_file_name}" deliveries=${data.deliveries?.length ?? 0}`);

  // Fire-and-forget initial log (não bloqueia a resposta)
  const logPromise = supabaseAdmin
    .from("route_import_logs")
    .insert({
      user_id: data.user_id,
      file_name: data.source_file_name,
      total_deliveries: data.total_deliveries,
      status: "started",
    })
    .select("id")
    .single()
    .then(({ data: logEntry, error }) => {
      if (error) {
        console.warn(`[Import-${importId}] Falha ao criar log inicial:`, error.message);
        return null;
      }
      return logEntry?.id ?? null;
    });

  try {
    let deliveries: NormalizedDelivery[] = data.deliveries?.length ? normalizeDeliveries(data.deliveries) : [];
    let totalDeliveries = data.total_deliveries;
    let totalRows = data.total_rows;
    let invalidRows = data.invalid_rows;

    if (!deliveries.length) {
      const fileImport = await loadDeliveriesFromStoredFile(data, importId, stage);
      deliveries = fileImport.deliveries as NormalizedDelivery[];
      totalDeliveries = fileImport.totalDeliveries;
      totalRows = fileImport.totalRows;
      invalidRows = fileImport.invalidRows;
    }

    stage("before-enqueue");
    const job = await enqueueRouteJobWithAdmin({
      ...data,
      deliveries,
      total_deliveries: totalDeliveries,
      total_rows: totalRows,
      invalid_rows: invalidRows,
    });
    stage(`after-enqueue job=${job.id}`);

    // Atualização de log também em background
    Promise.resolve(logPromise)
      .then((logId) => {
        if (!logId) return;
        return supabaseAdmin
          .from("route_import_logs")
          .update({ status: "success", duration_ms: Date.now() - startTime })
          .eq("id", logId);
      })
      .catch((err: any) => console.warn(`[Import-${importId}] log update failed:`, err?.message));

    return { jobId: job.id, uploadId: importId };
  } catch (err: any) {
    stage(`error message="${err?.message}"`);
    Promise.resolve(logPromise)
      .then((logId) => {
        if (!logId) return;
        return supabaseAdmin
          .from("route_import_logs")
          .update({
            status: "failed",
            error_message: err?.message || String(err),
            duration_ms: Date.now() - startTime,
          })
          .eq("id", logId);
      })
      .catch(() => {});
    throw err;
  }
}

export async function findRecentlyCreatedRouteWithAdmin(data: {
  startedAt: string;
  userId: string;
  companyId: string;
  fileName: string;
  totalDeliveries: number;
  routeDate: string;
}) {
  const earliestAcceptedCreatedAt = new Date(
    new Date(data.startedAt).getTime() - IMPORT_CLOCK_SKEW_BUFFER_MS,
  ).toISOString();

  const { data: route, error } = await supabaseAdmin
    .from("routes")
    .select("id")
    .eq("user_id", data.userId)
    .eq("company_id", data.companyId)
    .eq("source_file_name", data.fileName)
    .eq("total_deliveries", data.totalDeliveries)
    .eq("route_date", data.routeDate)
    .gte("created_at", earliestAcceptedCreatedAt)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return route ?? null;
}