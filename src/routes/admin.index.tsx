import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { adminService } from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { Users, CreditCard, Map as MapIcon, Package, AlertTriangle, TrendingDown } from "lucide-react";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { lazy, Suspense } from "react";

const MapView = lazy(() => import("@/components/MapView").then(m => ({ default: m.MapView })));

export const Route = createFileRoute("/admin/")({ component: () => <AppShell transitionType="slide-up"><Admin /></AppShell> });


function Admin() {
  const { t } = useTranslation();
  const { formattedRange } = useDateFilter();

  const { data, error, isLoading } = useQuery({
    queryKey: ["admin-stats", formattedRange],
    queryFn: () => adminService.getGlobalStats(formattedRange),
    retry: 1,
  });

  const stats = [
    { label: t("Usuários", "Usuários"), value: data?.users ?? 0, icon: Users },
    { label: t("Assinaturas ativas", "Assinaturas ativas"), value: data?.activeSubs ?? 0, icon: CreditCard },
    { label: t("Receita mensal", "Receita mensal"), value: formatBRL(data?.mrr ?? 0), icon: CreditCard },
    { label: t("Vencidas", "Vencidas"), value: data?.overdue ?? 0, icon: CreditCard },
    { label: t("Roteiros", "Roteiros"), value: data?.routes ?? 0, icon: MapIcon },
    { label: t("Entregas", "Entregas"), value: data?.deliveries ?? 0, icon: Package },
    { label: t("Alertas Insucesso", "Alertas Insucesso"), value: data?.problemCount ?? 0, icon: AlertTriangle },


  ];

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 border-destructive/20 bg-destructive/5 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">{t("Erro ao carregar dados", "Erro ao carregar dados")}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("Verifique suas permissões de administrador ou sua conexão.", "Verifique suas permissões de administrador ou sua conexão.")}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
        >
          {t("Tentar novamente", "Tentar novamente")}
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tighter">{t("Gestão Global", "Gestão Global")}</h1>
        <p className="text-sm font-medium text-muted-foreground opacity-70">{t("Monitoramento administrativo do ecossistema", "Monitoramento administrativo do ecossistema")}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 pb-32 lg:pb-0">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 xs:p-5 rounded-2xl border-border/10 bg-card/40 backdrop-blur-xl transition-all hover:border-primary/30">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] xs:text-[10px] uppercase tracking-widest text-muted-foreground font-black opacity-60 truncate">{s.label}</span>
              <s.icon className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-primary shrink-0" />
            </div>
            <div className="mt-2 text-xl xs:text-2xl font-black tracking-tighter truncate">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
             <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">{t("Mapa de Calor: Insucessos", "Mapa de Calor: Insucessos")}</h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">{t("Localização geográfica de problemas reportados", "Localização geográfica de problemas reportados")}</p>
          </div>
        </div>

        <Card className="rounded-[2.5rem] border-border/10 bg-card/40 backdrop-blur-xl overflow-hidden shadow-2xl h-[400px]">
           <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted/20" />}>
              <MapView 
                stops={(data?.problems || []).map((p: any) => ({
                  id: p.id,
                  latitude: Number(p.latitude),
                  longitude: Number(p.longitude),
                  status: p.status,
                  sequence: 1,
                }))}
              />
           </Suspense>
        </Card>
      </div>
    </div>
  );
}
