import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { todayBR } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { routeService } from "@/services/api";
import { routeJobService } from "@/services/job-service";
import { createRouteImport } from "@/lib/route-import.functions";

const IMPORT_JOB_TIMEOUT_MS = 10 * 60 * 1000;
const IMPORT_POLL_INTERVAL_MS = 1500;
const IMPORT_CLOCK_SKEW_BUFFER_MS = 2 * 60 * 1000;
const IMPORT_UPLOAD_TIMEOUT_MS = 20 * 1000;
const IMPORT_CREATE_JOB_TIMEOUT_MS = 45 * 1000;
const IMPORT_DIRECT_CREATE_TIMEOUT_MS = 90 * 1000;
const DIRECT_IMPORT_MAX_DELIVERIES = 1000;

type RouteImportResult = {
  id: string;
};

type RouteImportJobResult = {
  jobId: string;
  uploadId?: string;
};

type RouteJobStatusResult = {
  error_message: string | null;
  progress: number;
  route_id: string | null;
  status: string;
};

function generateUploadId() {
  const rnd = Math.random().toString(36).substring(2, 8);
  const ts = Date.now().toString(36);
  return `up_${ts}_${rnd}`;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "erro desconhecido";
}

function makeTimeoutError(message: string) {
  const error = new Error(message);
  error.name = "TimeoutError";
  return error;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let abortHandler: (() => void) | undefined;

  const guard = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(makeTimeoutError(message)), timeoutMs);
    if (signal) {
      abortHandler = () => reject(new DOMException("Aborted", "AbortError"));
      signal.addEventListener("abort", abortHandler, { once: true });
    }
  });

  try {
    return await Promise.race([promise, guard]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
  }
}

async function findRecentlyCreatedRoute({
  jobId,
  startedAt,
  userId,
  companyId,
  fileName,
  totalDeliveries,
  routeDate,
}: {
  jobId?: string;
  startedAt: string;
  userId: string;
  companyId: string;
  fileName: string;
  totalDeliveries: number;
  routeDate: string;
}) {
  const earliestAcceptedCreatedAt = new Date(
    new Date(startedAt).getTime() - IMPORT_CLOCK_SKEW_BUFFER_MS,
  ).toISOString();

  if (jobId) {
    const job = (await routeJobService.getJobStatus(jobId)) as RouteJobStatusResult | null;
    if (job?.route_id) {
      return { id: job.route_id };
    }
  }

  const { data: route, error } = await supabase
    .from("routes")
    .select("id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("source_file_name", fileName)
    .eq("total_deliveries", totalDeliveries)
    .eq("route_date", routeDate)
    .gte("created_at", earliestAcceptedCreatedAt)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) throw error;

  return route ?? null;
}

function getJobUiState(job: RouteJobStatusResult) {
  if (job.status === "pending") {
    return {
      stage: "Importação recebida pelo backend...",
      progress: 45,
      eta: "Entrando na fila de processamento...",
      log: "Job aguardando processador do backend.",
    };
  }

  if (job.status === "processing") {
    const backendProgress = Number.isFinite(job.progress) ? job.progress : 0;
    const progress = Math.max(55, Math.min(92, 45 + Math.round(backendProgress * 0.47)));
    const stage =
      backendProgress >= 25
        ? "Criando entregas no backend..."
        : "Preparando gravação do roteiro...";

    return {
      stage,
      progress,
      eta: "Salvando rota e entregas...",
      log: `Backend em processamento (${backendProgress}%).`,
    };
  }

  if (job.status === "done" && job.route_id) {
    return {
      stage: "Roteiro confirmado no backend!",
      progress: 96,
      eta: "Abrindo sua rota...",
      log: `Backend concluiu o job e retornou a rota ${job.route_id.slice(0, 8)}...`,
    };
  }

  return {
    stage: "Aguardando confirmação do backend...",
    progress: 72,
    eta: "Validando resultado...",
    log: `Status atual do job: ${job.status}.`,
  };
}

async function waitForRouteJobCompletion({
  jobId,
  signal,
  onUpdate,
}: {
  jobId: string;
  signal: AbortSignal;
  onUpdate: (job: RouteJobStatusResult) => void;
}) {
  const deadline = Date.now() + IMPORT_JOB_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const job = (await routeJobService.getJobStatus(jobId)) as RouteJobStatusResult | null;
    if (job) {
      onUpdate(job);

      if (job.status === "error") {
        throw new Error(
          job.error_message || `Falha no processamento do backend. Job ${jobId.slice(0, 8)}.`,
        );
      }

      if (job.route_id) {
        return { id: job.route_id };
      }
    }

    await wait(IMPORT_POLL_INTERVAL_MS);
  }

  return null;
}

export function useRouteImport() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [canCancel, setCanCancel] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString("pt-BR");
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  const setStep = (stage: string, value: number, eta = "") => {
    setUploadStage(stage);
    setProgress(value);
    setTimeRemaining(eta);
    if (stage) addLog(stage);
  };

  const cancel = () => {
    abortRef.current?.abort();
  };

  const importRoute = async (
    file: File | null,
    parsed: any,
    freightValue: string,
    driverId?: string | null,
  ) => {
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    const uploadId = generateUploadId();
    const sourceFileName = file?.name || "Entregas manuais";

    setLoading(true);
    setCanCancel(true);
    setAttempt(0);
    setLogs([]);
    addLog(`Upload ID: ${uploadId}`);
    addLog(`Iniciando importação de "${sourceFileName}"`);
    setStep("Preparando importação...", 8, "Validando dados...");

    const copyId = async (id: string) => {
      try {
        await navigator.clipboard.writeText(id);
        toast.success(`ID ${id} copiado`);
      } catch {
        toast.info(`ID: ${id}`);
      }
    };

    const isTimeoutError = (err: any) => {
      const m = (err?.message || "").toLowerCase();
      return (
        m.includes("timeout") ||
        m.includes("timed out") ||
        m.includes("demor") ||
        m.includes("aborted") ||
        m.includes("failed to fetch") ||
        m.includes("network") ||
        err?.name === "TimeoutError"
      );
    };

    const failWithDetail = (msg: string, extra?: string) => {
      const detail = extra ? ` (${extra})` : "";
      setUploadStage(`Falha na importação — ID ${uploadId}`);
      setTimeRemaining("");
      addLog(`ERRO: ${msg}${detail}`);
      toast.error(`${msg}${detail}`, {
        description: `ID do upload: ${uploadId} • Etapa: ${uploadStage || "—"} • Progresso: ${progress}%`,
        duration: 20000,
        action: { label: "Copiar ID", onClick: () => copyId(uploadId) },
      });
    };

    const failTimeout = (jobId?: string) => {
      const jobLabel = jobId ? ` Job ${jobId.slice(0, 8)}.` : "";
      const msg = `O servidor demorou para responder.${jobLabel} Sua importação pode ter sido recebida — verifique a lista de rotas antes de tentar novamente.`;
      setUploadStage(`Tempo esgotado — ID ${uploadId}`);
      setTimeRemaining("");
      addLog(`TIMEOUT: ${msg}`);
      toast.error("Tempo de resposta do servidor excedido", {
        description: `${msg}\nID do upload: ${uploadId}${jobId ? ` • Job: ${jobId}` : ""} • Etapa: ${uploadStage || "—"} • Progresso: ${progress}%`,
        duration: 25000,
        action: { label: "Copiar ID", onClick: () => copyId(uploadId) },
        cancel: { label: "Abrir lista", onClick: () => window.location.assign("/routes") },
      });
    };

    try {
      let user = auth.user;
      if (!user) {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData.session?.user ?? null;
      }
      if (!user) throw new Error("Sua sessão expirou. Faça login novamente.");
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");

      setStep("Configurando conta...", 18, "Verificando perfil...");

      let companyId = auth.companyId;
      let profileName = user.user_metadata?.full_name || "Usuário";
      const ACCOUNT_STEP_TIMEOUT_MS = 12 * 1000;

      if (!companyId) {
        addLog("Sem companyId em cache — buscando perfil no backend...");
        const profileRes = await withTimeout(
          (async () =>
            await supabase
              .from("profiles")
              .select("company_id, full_name")
              .eq("user_id", user.id)
              .maybeSingle())(),
          ACCOUNT_STEP_TIMEOUT_MS,
          "Tempo excedido ao buscar o perfil do usuário.",
          signal,
        );
        if (profileRes.error) throw new Error(`Falha ao ler perfil: ${profileRes.error.message}`);
        const profile = profileRes.data as { company_id: string | null; full_name: string | null } | null;

        if (profile?.company_id) {
          companyId = profile.company_id;
          profileName = profile.full_name || profileName;
          addLog(`Empresa do perfil: ${companyId.slice(0, 8)}...`);
        } else {
          setStep("Configurando conta...", 22, "Procurando empresa vinculada...");
          const ownedRes = await withTimeout(
            (async () =>
              await supabase
                .from("companies")
                .select("id")
                .eq("owner_user_id", user.id)
                .maybeSingle())(),
            ACCOUNT_STEP_TIMEOUT_MS,
            "Tempo excedido ao buscar a empresa do usuário.",
            signal,
          );
          if (ownedRes.error) throw new Error(`Falha ao ler empresa: ${ownedRes.error.message}`);
          const ownedCompany = ownedRes.data as { id: string } | null;

          if (ownedCompany) {
            companyId = ownedCompany.id;
            addLog(`Empresa existente: ${companyId.slice(0, 8)}...`);
          } else {
            setStep("Configurando conta...", 26, "Criando sua empresa...");
            const createRes = await withTimeout(
              (async () =>
                await supabase
                  .from("companies")
                  .insert({ name: `Empresa de ${profileName}`, owner_user_id: user.id })
                  .select()
                  .single())(),
              ACCOUNT_STEP_TIMEOUT_MS,
              "Tempo excedido ao criar empresa.",
              signal,
            );
            if (createRes.error) throw new Error(`Falha ao criar empresa: ${createRes.error.message}`);
            companyId = (createRes.data as { id: string }).id;
            addLog(`Empresa criada: ${companyId.slice(0, 8)}...`);
          }

          setStep("Configurando conta...", 30, "Vinculando perfil...");
          const updateRes = await withTimeout(
            (async () =>
              await supabase.from("profiles").update({ company_id: companyId }).eq("user_id", user.id))(),
            ACCOUNT_STEP_TIMEOUT_MS,
            "Tempo excedido ao vincular empresa ao perfil.",
            signal,
          );
          if (updateRes.error) {
            // Não bloqueia — companyId já existe; só registra
            addLog(`AVISO: não foi possível atualizar perfil (${updateRes.error.message}). Seguindo mesmo assim.`);
          }
        }
      }

      if (!companyId) throw new Error("Não foi possível obter a empresa do usuário.");

      if (signal.aborted) throw new DOMException("Aborted", "AbortError");

      const name = `${profileName} - Rota Shopee - ${todayBR()}`;
      let fValue = freightValue ? parseFloat(freightValue.replace(/\./g, "").replace(",", ".")) : 0;
      if (isNaN(fValue)) fValue = 0;

      const deliveriesToInsert = parsed.valid.map((d: any, index: number) => {
        let deliveryFreight = d.freight_value != null ? Number(d.freight_value) : 0;
        if (isNaN(deliveryFreight)) deliveryFreight = 0;

        return {
          at_id: d.at_id || null,
          sequence: Number(d.sequence) || index + 1,
          original_sequence: Number(d.sequence) || index + 1,
          spx_tn: d.spx_tn || null,
          destination_address: d.destination_address || "Endereço não informado",
          neighborhood: d.neighborhood || null,
          city: d.city || null,
          zipcode: d.zipcode || null,
          latitude: d.latitude != null ? Number(d.latitude) : null,
          longitude: d.longitude != null ? Number(d.longitude) : null,
          freight_value: deliveryFreight,
          status: "pending" as const,
          confidence: d.confidence || "high",
          confidence_reason: d.confidence_reason || null,
          package_count: d.package_count || 1,
        };
      });
      if (deliveriesToInsert.length === 0)
        throw new Error("A planilha não possui entregas válidas.");

      addLog(
        `Total de entregas válidas: ${deliveriesToInsert.length} / inválidas: ${parsed.invalid}`,
      );
      setStep(`Criando roteiro...`, 35, "Registrando no banco...");

      const importStartedAt = new Date().toISOString();
      const importPayload = {
        name,
        source_file_name: sourceFileName,
        company_id: companyId!,
        user_id: user.id,
        driver_id: driverId || user.id,
        route_date: new Date().toISOString().split("T")[0],
        total_deliveries: deliveriesToInsert.length,
        freight_value: fValue,
        deliveries: deliveriesToInsert,
        total_rows: parsed.total,
        invalid_rows: parsed.invalid,
        upload_id: uploadId,
      };

      const t0 = Date.now();
      let directAttempted = false;

      const openRoute = (routeId: string) => {
        setCanCancel(false);
        setStep("Finalizando...", 95, "Abrindo sua rota...");
        toast.success("Roteiro criado!");
        window.location.assign(`/routes/${routeId}`);
      };

      const findCreatedRouteAfterAttempt = async (jobId?: string) => {
        const route = await findRecentlyCreatedRoute({
          jobId,
          startedAt: importStartedAt,
          userId: user.id,
          companyId: companyId!,
          fileName: sourceFileName,
          totalDeliveries: deliveriesToInsert.length,
          routeDate: importPayload.route_date,
        }).catch((lookupErr) => {
          addLog(`AVISO: nao foi possivel confirmar rota recente (${getErrorMessage(lookupErr)}).`);
          return null;
        });

        if (route?.id) {
          addLog(`Roteiro localizado (ID: ${route.id.slice(0, 8)}...)`);
        }

        return route;
      };

      const createFastRoute = async () => {
        directAttempted = true;
        addLog(`Modo rapido: criando roteiro direto com ${deliveriesToInsert.length} entregas.`);
        setStep("Salvando rota e entregas...", 55, "Modo rapido ativo...");

        const route = await withTimeout(
          routeService.createRouteWithDeliveries(importPayload),
          IMPORT_DIRECT_CREATE_TIMEOUT_MS,
          "Tempo excedido ao criar o roteiro diretamente no banco.",
          signal,
        );

        if (!route?.id) {
          throw new Error("O roteiro foi criado sem identificador retornado.");
        }

        addLog(`Roteiro criado em ${Date.now() - t0}ms (ID: ${route.id.slice(0, 8)}...)`);
        openRoute(route.id);
      };

      if (deliveriesToInsert.length <= DIRECT_IMPORT_MAX_DELIVERIES) {
        try {
          await createFastRoute();
          return;
        } catch (directErr) {
          if ((directErr as any)?.name === "AbortError") throw directErr;
          addLog(`AVISO: modo rapido falhou (${getErrorMessage(directErr)}).`);

          const confirmedRoute = await findCreatedRouteAfterAttempt();
          if (confirmedRoute?.id) {
            openRoute(confirmedRoute.id);
            return;
          }

          if (isTimeoutError(directErr)) {
            failTimeout();
            setProgress(88);
            setTimeRemaining("Confira a lista de rotas antes de tentar de novo.");
            return;
          }

          addLog("Tentando fluxo de backend como fallback...");
        }
      } else {
        addLog(`Planilha com ${deliveriesToInsert.length} entregas: usando fluxo de backend.`);
      }

      let storedFilePath: string | undefined;

      if (file) {
        const fileExt = (file.name.split(".").pop() || "xlsx").toLowerCase();
        const storagePath = `${user.id}/${uploadId}.${fileExt}`;

        addLog(`Salvando planilha no backend...`);
        try {
          const { error: uploadError } = await withTimeout(
            supabase.storage.from("route-files").upload(storagePath, file, {
              cacheControl: "3600",
              upsert: true,
              contentType:
                file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }),
            IMPORT_UPLOAD_TIMEOUT_MS,
            "Tempo excedido ao enviar a planilha para o Storage.",
            signal,
          );

          if (uploadError) {
            throw new Error(`Falha ao enviar planilha: ${uploadError.message}`);
          }

          storedFilePath = storagePath;
          addLog(`Planilha salva no Storage.`);
        } catch (uploadErr) {
          if ((uploadErr as any)?.name === "AbortError") throw uploadErr;
          addLog(
            `AVISO: nao foi possivel salvar o arquivo no Storage (${getErrorMessage(uploadErr)}). Continuando com os dados ja lidos.`,
          );
          toast.warning("Upload do arquivo ignorado", {
            description: "Vou criar o roteiro com os dados ja processados da planilha.",
            duration: 8000,
          });
        }
      } else {
        addLog("Importacao manual: sem arquivo para salvar no Storage.");
      }

      const createDirectRoute = async (reason: string) => {
        directAttempted = true;
        addLog(`Criando roteiro direto no banco (${reason})...`);
        setStep("Salvando rota e entregas...", 60, "Usando modo direto...");
        const route = await withTimeout(
          routeService.createRouteWithDeliveries(importPayload),
          IMPORT_DIRECT_CREATE_TIMEOUT_MS,
          "Tempo excedido ao criar o roteiro diretamente no banco.",
          signal,
        );

        if (!route?.id) {
          throw new Error("O roteiro foi criado sem identificador retornado.");
        }

        addLog(
          `Roteiro criado no modo direto em ${Date.now() - t0}ms (ID: ${route.id.slice(0, 8)}...)`,
        );
        openRoute(route.id);
      };

      addLog(storedFilePath ? `Criando job no backend...` : `Criando job com dados da planilha...`);
      let job: RouteImportJobResult;
      try {
        job = await withTimeout(
          createRouteImport({
            data: {
              ...importPayload,
              deliveries: storedFilePath ? undefined : deliveriesToInsert,
              total_deliveries: Math.max(1, parsed.valid.length),
              stored_file_path: storedFilePath,
            },
          }) as Promise<RouteImportJobResult>,
          IMPORT_CREATE_JOB_TIMEOUT_MS,
          "Tempo excedido ao criar o job de importacao.",
          signal,
        );
      } catch (jobErr) {
        if ((jobErr as any)?.name === "AbortError") throw jobErr;
        addLog(`AVISO: job de importacao indisponivel (${getErrorMessage(jobErr)}).`);
        if (directAttempted) {
          const confirmedRoute = await findCreatedRouteAfterAttempt();
          if (confirmedRoute?.id) {
            openRoute(confirmedRoute.id);
            return;
          }
          throw jobErr;
        }
        await createDirectRoute("job indisponivel");
        return;
      }

      addLog(`Job ${job.jobId.slice(0, 8)}... criado em ${Date.now() - t0}ms`);
      setStep("Importação recebida pelo backend...", 45, "Iniciando processamento...");

      let lastJobSnapshot = "";
      const route = await waitForRouteJobCompletion({
        jobId: job.jobId,
        signal,
        onUpdate: (jobStatus) => {
          const ui = getJobUiState(jobStatus);
          setUploadStage(ui.stage);
          setProgress(ui.progress);
          setTimeRemaining(ui.eta);

          const snapshot = `${jobStatus.status}:${jobStatus.progress}:${jobStatus.route_id ?? ""}:${jobStatus.error_message ?? ""}`;
          if (snapshot !== lastJobSnapshot) {
            lastJobSnapshot = snapshot;
            addLog(ui.log);
          }
        },
      });

      if (!route?.id) {
        addLog(
          `Tempo de espera excedido para o job ${job.jobId.slice(0, 8)}. Fazendo busca final...`,
        );
        const lastTry = await findCreatedRouteAfterAttempt(job.jobId);

        if (lastTry?.id) {
          openRoute(lastTry.id);
          return;
        }

        addLog(`Job ${job.jobId.slice(0, 8)} ainda em processamento ao expirar o tempo.`);
        failTimeout(job.jobId);
        setProgress(88);
        setTimeRemaining("Abra a lista para acompanhar a rota criada.");
        return;
      }

      addLog(`Roteiro criado em ${Date.now() - t0}ms (ID: ${route.id.slice(0, 8)}...)`);

      if (signal.aborted) throw new DOMException("Aborted", "AbortError");

      openRoute(route.id);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setUploadStage("Importação cancelada");
        setTimeRemaining("");
        toast.info("Importação cancelada");
      } else {
        console.error(`[useRouteImport] [${uploadId}] Error:`, e);
        if (isTimeoutError(e)) {
          failTimeout();
        } else {
          failWithDetail(e.message || "Erro ao criar roteiro");
        }
      }
    } finally {
      setLoading(false);
      setCanCancel(false);
      abortRef.current = null;
    }
  };

  return {
    importRoute,
    cancel,
    loading,
    uploadStage,
    progress,
    timeRemaining,
    attempt,
    canCancel,
    logs,
  };
}
