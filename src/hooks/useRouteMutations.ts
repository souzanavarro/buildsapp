import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { routeService } from "@/services/api";

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

export function useRouteMutations() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const updateRouteMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data, error } = await supabase
        .from("routes")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["route", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["route-detail", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast.success("Roteiro atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar roteiro:", error);
      toast.error("Não foi possível atualizar o roteiro.");
    },
  });

  const deleteRouteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      let lastError: any = null;

      for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          if (attempt > 1) {
            toast.info(`Tentando novamente (${attempt}/${MAX_RETRY_ATTEMPTS})...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt - 1)));
          }
          return await routeService.deleteRoute(id, reason);
        } catch (err: any) {
          lastError = err;
          console.error(`Falha na tentativa ${attempt} de exclusão:`, err);
          if (attempt === MAX_RETRY_ATTEMPTS) break;
        }
      }
      throw lastError;
    },
    onSuccess: (_, variables) => {
      // Immediate cache cleanup
      queryClient.removeQueries({ queryKey: ["route", variables.id] });
      queryClient.removeQueries({ queryKey: ["route-detail", variables.id] });

      // Force refresh lists by invalidating with exact=false to catch all date ranges
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["available-routes-map"] });

      toast.success("Roteiro excluído!");
      navigate({ to: "/dashboard" });
    },
    onError: (error: any) => {
      console.error("Erro final ao excluir roteiro:", error);
      const msg = error?.message || "Erro de conexão ou permissão";
      toast.error(`Falha ao excluir: ${msg}`, {
        duration: 8000,
      });
    },
  });

  return {
    deleteRoute: deleteRouteMutation.mutateAsync,
    updateRoute: updateRouteMutation.mutateAsync,
    isDeleting: deleteRouteMutation.isPending,
    isUpdating: updateRouteMutation.isPending,
  };
}
