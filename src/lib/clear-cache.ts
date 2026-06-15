import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Limpa todos os caches do app: Service Worker, React Query, localStorage
 * (preservando token de auth do Supabase) e força reload.
 */
export async function clearAllAppCaches(queryClient?: QueryClient) {
  try {
    // 1. React Query
    queryClient?.clear();

    // 2. Service Worker caches
    if (typeof caches !== "undefined") {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }

    // 3. Mensagem ao SW para limpar internamente também
    if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage("CLEAR_ALL_CACHES");
    }

    // 4. Desregistra SWs antigos para forçar reinstalação
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }

    // 5. Limpa storage exceto sessão Supabase
    if (typeof localStorage !== "undefined") {
      const keysToKeep: Array<[string, string]> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("sb-") || k.includes("supabase.auth"))) {
          keysToKeep.push([k, localStorage.getItem(k) ?? ""]);
        }
      }
      localStorage.clear();
      keysToKeep.forEach(([k, v]) => localStorage.setItem(k, v));
    }

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
    }

    toast.success("Cache limpo! Recarregando...", { duration: 1500 });
    setTimeout(() => window.location.reload(), 800);
  } catch (err) {
    console.error("Falha ao limpar cache:", err);
    toast.error("Não foi possível limpar o cache completamente.");
  }
}
