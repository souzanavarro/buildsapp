import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangleIcon, CheckIcon, UsersIcon } from "@/components/ui/icons";
import { History, Hash, Clock, FileText } from "lucide-react";

export const Route = createFileRoute("/admin/deletion-logs")({
  component: DeletionLogsPage,
});

function DeletionLogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-deletion-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_deletion_logs")
        .select(`
          *
        `)
        .order("deleted_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary font-bold">
            <History className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter">Histórico de Exclusões</h1>
            <p className="text-muted-foreground font-medium">Auditoria de roteiros removidos do sistema</p>
          </div>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <div className="text-center p-12 text-muted-foreground animate-pulse font-bold">Carregando logs de auditoria...</div>
          ) : logs?.length === 0 ? (
            <div className="text-center p-12 bg-muted/20 rounded-3xl border-2 border-dashed font-bold">
              Nenhuma exclusão registrada ainda.
            </div>
          ) : (
            logs?.map((log: any) => (
              <Card key={log.id} className="rounded-3xl border-border/10 overflow-hidden hover:border-primary/20 transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        {log.status === "success" ? (
                          <CheckIcon className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <AlertTriangleIcon className="h-5 w-5 text-red-500" />
                        )}
                        <h3 className="text-xl font-bold tracking-tight">{log.route_name || "Roteiro Desconhecido"}</h3>
                        <Badge variant={log.status === "success" ? "default" : "destructive"} className="rounded-full">
                          {log.status === "success" ? "Sucesso" : "Falha"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-2 text-sm font-medium">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <UsersIcon className="h-4 w-4" />
                          <span className="text-foreground truncate max-w-[150px]">Usuário: {log.user_id?.split('-')[0]}...</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span className="font-bold text-foreground">Motivo:</span> {log.reason || "Manual"}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="font-bold text-foreground">Data:</span> {log.deleted_at ? format(new Date(log.deleted_at), "PPP 'às' HH:mm", { locale: ptBR }) : "N/A"}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground truncate max-w-xs">
                          <Hash className="h-4 w-4" />
                          <span className="font-bold text-foreground">ID Rota:</span> {log.route_id}
                        </div>
                      </div>
                    </div>

                    {log.error_details && (
                      <div className="md:w-1/3 bg-red-500/5 p-4 rounded-2xl border border-red-500/10 self-start">
                        <div className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Erro Detectado</div>
                        <p className="text-xs font-mono text-red-700/80 leading-relaxed truncate">{String(log.error_details)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
