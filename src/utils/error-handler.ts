import { toast } from "sonner";

interface ErrorHandlerOptions {
  title?: string;
  description?: string;
}

/**
 * Parses and handles errors from Supabase Edge Functions or generic API calls.
 */
export async function handleApiError(error: any, options: ErrorHandlerOptions = {}) {
  console.group("API Error Diagnostics");
  console.error("Original Error:", error);
  
  let errorMessage = "Ocorreu um erro inesperado.";
  let status = error?.status || error?.context?.status;
  
  // Try to extract message from various Supabase error formats
  if (error?.message) {
    errorMessage = error.message;
  }
  
  // If it's a Supabase error with context/status
  if (status) {
    console.log("Error Status:", status);
    if (status === 401) {
      errorMessage = "Sessão expirada ou não autorizado. Por favor, faça login novamente.";
    } else if (status === 403) {
      errorMessage = "Você não tem permissão de Administrador para realizar esta ação.";
    } else if (status === 400) {
      errorMessage = "Requisição inválida. O servidor não pôde processar os dados.";
    } else if (status === 404) {
      errorMessage = "Recurso não encontrado no servidor.";
    } else if (status >= 500) {
      errorMessage = "Erro interno no servidor de build. Tente novamente em alguns instantes.";
    }
  }

  // Handle body response if available (Edge Functions often return JSON error)
  if (error?.context?.json) {
    const json = await error.context.json().catch(() => null);
    if (json?.error) {
      errorMessage = json.error;
    }
    if (json?.details) {
      errorMessage += ` (${json.details})`;
    }
    console.log("Error Body:", json);
  }

  console.groupEnd();

  toast.error(options.title || "Erro na Operação", {
    description: options.description || errorMessage,
    duration: 5000,
  });

  return errorMessage;
}

/**
 * Standardizes the response from a Supabase function invoke.
 */
export async function invokeFunction(supabase: any, functionName: string, options: any = {}) {
  const { data, error } = await supabase.functions.invoke(functionName, options);

  if (error) {
    await handleApiError(error, {
      title: `Erro em ${functionName}`,
    });
    return { data: null, error };
  }

  return { data, error: null };
}
