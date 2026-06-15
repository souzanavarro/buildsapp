import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

import { useMemo, lazy, Suspense, useEffect, useState } from "react";
import { FuelSettingsCard, loadFuelSettings, type FuelSettings } from "@/components/dashboard/FuelSettingsCard";
import { useDashboardStats, usePrefetchRoute } from "@/hooks/queries/useRouteQueries";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { PremiumCard } from "@/components/ui/premium-card";
import { RouteStatItem } from "@/components/ui/route-stat-item";
import { StatusBadge } from "@/components/ui/status-badge";
import { CompactRouteListItem } from "@/components/ui/compact-route-list-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { routeService } from "@/services/api";
import { useAuth, hasRole } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PackageIcon as Package,
  TruckIcon as Truck,
  MapPinIcon as MapPin,
  UploadIcon as Upload,
  ArrowRightIcon as ArrowRight,
  DollarIcon as DollarSign,
  TrendingUpIcon as TrendingUp,
  ClockIcon as CalendarIcon,
  ClockIcon as Clock,
  CheckIcon as CheckCircle2,
  NavigationIcon,
  SparklesIcon as Sparkles,
  ZapIcon as Zap,
} from "@/components/ui/icons";
import { DownloadIcon as Download, SmartphoneIcon as Smartphone } from "@/components/ui/icons";
import { DriverScoreCard } from "@/components/dashboard/DriverScoreCard";
import { PerformanceScore } from "@/components/performance/PerformanceScore";
import { ROIAnalytics } from "@/components/analytics/ROIAnalytics";
import { PerformanceRanking } from "@/components/performance/PerformanceRanking";

import { getStatusLabel, statusColor } from "@/lib/format";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { cn } from "@/lib/utils";
import { useLocation } from "@/contexts/LocationContext";
import { DashboardStatCard } from "@/components/analytics/DashboardStatCard";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";
import { SystemTutorialVideo } from "@/components/dashboard/SystemTutorialVideo";

const AnalyticsCharts = lazy(() =>
  import("@/components/analytics/AnalyticsCharts").then((mod) => ({
    default: mod.AnalyticsCharts,
  })),
);

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AppShell transitionType="slide-right">
      <Dashboard />
    </AppShell>
  ),
});

function Dashboard() {
  const { t } = useTranslation();
  const { formattedRange } = useDateFilter();

  const { requestAllPermissions } = useLocation();
  const prefetchRoute = usePrefetchRoute();
  const { roles } = useAuth();
  const isAdmin = hasRole(roles, "admin");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"admin" | "subscriber">("admin");

  useEffect(() => {
    requestAllPermissions();
  }, [requestAllPermissions]);

  const isSubscriberView = isAdmin && viewMode === "subscriber";
  const driverFilter = isAdmin && !isSubscriberView && selectedDriver !== "all" ? selectedDriver : null;
  const { data, isLoading } = useDashboardStats(formattedRange, driverFilter, isSubscriberView);

  const { data: drivers } = useQuery({
    queryKey: ["dashboard-drivers"],
    queryFn: () => routeService.listDrivers(),
    enabled: isAdmin,
    staleTime: 1000 * 60 * 10,
  });

  const [fuelSettings, setFuelSettings] = useState<FuelSettings>(() => loadFuelSettings());

  const serverFuel = (data as any)?.fuelSettings as
    | { fuelPrice: number; kmPerLiter: number; isAverage: boolean }
    | undefined;
  const isAverageView = !!serverFuel?.isAverage;

  // Sync local settings with server-resolved values (own / driver / average)
  useEffect(() => {
    if (serverFuel && serverFuel.fuelPrice > 0 && serverFuel.kmPerLiter > 0) {
      setFuelSettings({
        fuelPrice: Number(serverFuel.fuelPrice),
        kmPerLiter: Number(serverFuel.kmPerLiter),
      });
    }
  }, [serverFuel?.fuelPrice, serverFuel?.kmPerLiter]);

  const { fuelCost, netProfit, tollsCost, netFreight } = useMemo(() => {
    const distance = data?.estimatedDistanceKm ?? 0;
    const cost =
      fuelSettings.kmPerLiter > 0
        ? (distance / fuelSettings.kmPerLiter) * fuelSettings.fuelPrice
        : 0;
    const tolls = (data as any)?.tollsCost ?? 0;
    const freight = data?.totalFreight ?? 0;
    const net = freight - tolls;
    return {
      fuelCost: cost,
      tollsCost: tolls,
      netFreight: net,
      netProfit: net - cost,
    };
  }, [data?.estimatedDistanceKm, data?.totalFreight, fuelSettings, data]);



  const stats = useMemo(
    () => [
      {
        label: t("Faturamento Total", "Faturamento Total"),
        value: `R$ ${(data?.totalFreight ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        icon: DollarSign,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        description: "Soma bruta dos fretes no período",
      },
      {
        label: t("Volumes Processados", "Volumes Processados"),
        value: data?.total ?? 0,
        icon: Package,
        color: "text-primary",
        bg: "bg-primary/10",
        description: "Pacotes identificados",
      },
      {
        label: t("Pending", "Em Aguardo"),
        value: data?.byStatus.pending ?? 0,
        icon: Clock,
        color: "text-sky-500",
        bg: "bg-sky-500/10",
        description: "Aguardando início",
      },
      {
        label: t("Taxa de Sucesso", "Taxa de Sucesso"),
        value: data?.total ? `${Math.round((data.byStatus.delivered / data.total) * 100)}%` : "0%",
        icon: CheckCircle2,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        description: "Entregas finalizadas",
      },
      {
        label: t("Lucro Líquido", "Lucro Líquido"),
        value: `R$ ${netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        icon: TrendingUp,
        color: "text-emerald-400",
        bg: "bg-emerald-400/10",
        description: tollsCost > 0
          ? "(Frete − pedágios) − combustível"
          : "Frete − combustível",
      },

    ],
    [data, netProfit, tollsCost, netFreight],
  );

  if (isLoading) {
    return (
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-6 border-b border-border/10">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-12 w-64 rounded-2xl" />
            <Skeleton className="h-4 w-96 rounded-full" />
          </div>
          <Skeleton className="h-14 w-56 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44 rounded-[2.5rem]" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Skeleton className="md:col-span-2 h-[450px] rounded-[2.5rem]" />
          <div className="space-y-8">
            <Skeleton className="h-56 rounded-[2.5rem]" />
            <Skeleton className="h-56 rounded-[2.5rem]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32 lg:pb-12">
      <PermissionGuard />
      {/* Premium Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-border/10 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2 relative z-10"
        >
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.25em] mb-3 bg-primary/5 w-fit px-4 py-1.5 rounded-full border border-primary/10">
            <Zap className="h-3.5 w-3.5" />
            {t("SaaS Enterprise v2.0", "SaaS Enterprise v2.0")}
          </div>
          <h1 className="display-hero">
            {t("Operação", "Operação")} <span className="text-brand-gradient">Premium</span>
          </h1>
          <p className="text-muted-foreground font-medium text-sm xs:text-base max-w-xl leading-relaxed opacity-80 mt-4">
            {t("Inteligência logística de alto nível para transportadoras e motoristas Shopee.", "Inteligência logística de alto nível para transportadoras e motoristas Shopee.")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="w-full md:w-auto relative z-10 flex flex-col md:flex-row items-stretch md:items-center gap-3"
        >
          {isAdmin && (
            <>
              <div className="inline-flex rounded-xl border border-border/20 bg-card/50 backdrop-blur-xl p-1 h-10">
                <button
                  type="button"
                  onClick={() => setViewMode("admin")}
                  className={cn(
                    "px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    viewMode === "admin"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("subscriber")}
                  className={cn(
                    "px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    viewMode === "subscriber"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Motorista
                </button>
              </div>
              {!isSubscriberView && (
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger className="w-full md:w-[220px] h-10 rounded-xl border-border/20 bg-card/50 backdrop-blur-xl font-bold text-xs">
                    <SelectValue placeholder="Filtrar por motorista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os motoristas</SelectItem>
                    {(drivers ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
          {(isAdmin || hasRole(roles, "subscriber")) && (
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <Link to="/upload" className="w-full md:w-auto">
                <Button variant="premium" size="lg" className="w-full md:w-auto group h-12">
                  <Upload className="h-5 w-5 mr-3 group-hover:translate-y-[-2px] transition-transform" />
                  {t("Importar Operação", "Importar Operação")}
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin/app-versions" className="w-full md:w-auto">
                  <Button variant="outline" size="lg" className="w-full md:w-auto group h-12 border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-2xl">
                    <Smartphone className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                    {t("Build Android", "Build Android")}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </motion.div>

        {/* Predictive Maintenance Alert */}
        {(data as any)?.needsMaintenance && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-amber-500/5"
          >
            <div className="bg-amber-500 p-2 rounded-xl">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-amber-700 uppercase tracking-widest">{t("Manutenção Preditiva", "Manutenção Preditiva")}</p>
              <p className="text-[10px] font-bold text-amber-600/80">{t("O veículo atingiu o limite de KM. Recomendamos agendar revisão.", "O veículo atingiu o limite de KM. Recomendamos agendar revisão.")}</p>
            </div>
            <Link to="/admin/maintenance">
              <Button size="sm" variant="outline" className="rounded-xl border-amber-500/30 text-amber-700 font-bold text-[10px]">{t("Agendar", "Agendar")}</Button>
            </Link>
          </motion.div>
        )}

        <div className="absolute top-0 right-1/4 h-64 w-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10"
      >

        {stats.map((s, idx) => (
          <RouteStatItem 
            key={s.label} 
            {...s} 
            className={isLoading ? "animate-pulse" : "premium-shadow"}
          />
        ))}
      </motion.div>

      {/* Chart Section with elevated design */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        <Suspense fallback={<Skeleton className="h-[450px] w-full rounded-[2.5rem]" />}>
          <AnalyticsCharts data={data || null} />
        </Suspense>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {!isAdmin ? (
          <div className="xl:col-span-1 space-y-8">
            <PerformanceScore 
              score={data?.total ? (data?.byStatus?.delivered || 0) * 10 : 0} 
              level={Math.floor(((data?.byStatus?.delivered || 0) * 10) / 1000) + 1}
              badges={(data as any)?.badges || []}
              efficiency={data?.total ? Math.round(((data?.byStatus?.delivered || 0) / data.total) * 100) : 0}
            />
            <PerformanceRanking 
              drivers={[
                { id: '1', name: 'Você', score: (data?.byStatus.delivered || 0) * 10, trend: 'up', isMe: true },
                { id: '2', name: 'Carlos Silva', score: 1250, trend: 'up' },
                { id: '3', name: 'João Pereira', score: 980, trend: 'down' },
              ]}
            />
          </div>
        ) : (
          <div className="xl:col-span-3">
             <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-[2.5rem]" />}>
               <ROIAnalytics 
                 totalFreight={data?.totalFreight || 0}
                 totalDistance={data?.estimatedDistanceKm || 0}
                 initialFuelPrice={fuelSettings.fuelPrice}
                 initialKmPerLiter={fuelSettings.kmPerLiter}
               />
             </Suspense>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className={cn("md:col-span-2 pb-16 lg:pb-0", !isAdmin ? "xl:col-span-2" : "xl:col-span-2")}
        >
          <PremiumCard className="h-full">
            <CardHeader className="border-b border-border/5 bg-muted/20 px-6 xs:px-8 py-5 xs:py-7 flex flex-row items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <CardTitle className="text-lg xs:text-xl font-black flex items-center gap-3 tracking-tight truncate">
                  <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                    <Truck className="h-4 w-4 xs:h-5 xs:w-5 text-primary" />
                  </div>
                  {t("Últimos Roteiros", "Últimos Roteiros")}
                </CardTitle>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-10">
                  {t("Histórico de atividade", "Histórico de atividade")}
                </p>
              </div>
              <Link to="/routes">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-black text-[10px] xs:text-xs uppercase tracking-widest text-primary hover:bg-primary/10 rounded-xl px-3 xs:px-5 h-9 xs:h-10 shrink-0"
                >
                  {t("Ver Tudo", "Ver Tudo")} <ArrowRight className="h-3.5 w-3.5 ml-1.5 xs:ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 space-y-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-2xl bg-muted/40" />
                  ))}
                </div>
              ) : !data?.routes.length ? (
                <div className="flex flex-col items-center justify-center py-28 px-8 text-center">
                  <div className="bg-muted/30 p-6 rounded-2xl mb-6 shadow-inner">
                    <Package className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-2xl font-black mb-2 tracking-tight">{t("Vazio por aqui?", "Vazio por aqui?")}</h3>
                  {isAdmin || hasRole(roles, "subscriber") ? (
                    <>
                      <p className="text-muted-foreground font-medium text-sm max-w-sm mb-8 leading-relaxed">
                        {t("Comece importando sua primeira planilha para visualizar a mágica acontecer.", "Comece importando sua primeira planilha para visualizar a mágica acontecer.")}
                      </p>
                      <Link to="/upload">
                        <Button
                          variant="default"
                          className="rounded-xl px-8 h-12 font-black shadow-lg shadow-primary/20"
                        >
                          {t("Iniciar Primeira Rota", "Iniciar Primeira Rota")}
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <p className="text-muted-foreground font-medium text-sm max-w-sm mb-8 leading-relaxed">
                      {t("Aguardando atribuição de rotas pelo administrador.", "Aguardando atribuição de rotas pelo administrador.")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {data.routes.map((r: any, idx: number) => (
                    <CompactRouteListItem key={r.id} route={r} index={idx} />
                  ))}
                </div>
              )}
            </CardContent>
          </PremiumCard>
        </motion.div>

        {/* Action Widgets */}
        <div className="space-y-10">
          <FuelSettingsCard
            settings={fuelSettings}
            onChange={setFuelSettings}
            estimatedDistanceKm={data?.estimatedDistanceKm ?? 0}
            estimatedFuelCost={fuelCost}
            readOnly={isAverageView}
            readOnlyHint={
              isAverageView
                ? "Média das configurações de combustível de todos os usuários."
                : undefined
            }
          />


          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            <Card className="rounded-[2.5rem] border-none bg-brand-gradient text-primary-foreground shadow-[0_30px_60px_-15px_rgba(255,140,0,0.3)] relative overflow-hidden group h-full flex flex-col">
              <div className="absolute -right-8 -bottom-8 opacity-[0.15] group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-1000 transform">
                <NavigationIcon className="h-56 w-56" />
              </div>

              {/* Glossy overlay effect */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

              <CardContent className="p-10 relative z-10 flex flex-col h-full">
                <div className="bg-white/20 w-fit p-3 rounded-2xl mb-8 shadow-xl backdrop-blur-md">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-3xl font-black leading-[1] mb-4 tracking-tighter">
                  {t("Otimização Ativa", "Otimização Ativa")}
                </h3>
                <p className="text-white/80 text-base font-medium mb-10 leading-relaxed">
                  {t("Seu próximo destino já foi calculado? Acesse o mapa inteligente agora.", "Seu próximo destino já foi calculado? Acesse o mapa inteligente agora.")}
                </p>
                <Link to="/map" search={{ routeId: undefined }} className="mt-auto">
                  <Button
                    variant="glass"
                    className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl"
                  >
                    <NavigationIcon className="h-5 w-5 mr-3" /> {t("Abrir Navegador", "Abrir Navegador")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <Card className="rounded-[2.5rem] border-border/10 shadow-xl bg-card/50 backdrop-blur-xl overflow-hidden group">
              <CardHeader className="pb-4 pt-8 px-8">
                <CardTitle className="text-[11px] font-black flex items-center gap-3 text-muted-foreground uppercase tracking-[0.25em] opacity-70">
                  <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(255,140,0,0.5)]" />
                  {t("Resumo Operacional", "Resumo Operacional")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-10 space-y-6">
                <div className="space-y-1 group/item">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-bold text-muted-foreground/60">{t("Volume Total", "Volume Total")}</span>
                    <span className="text-lg font-black tracking-tight">{data?.total ?? 0}</span>
                  </div>
                  <div className="h-[2px] w-full bg-border/10 overflow-hidden rounded-full">
                    <div className="h-full w-0 group-hover/item:w-full bg-primary/20 transition-all duration-700" />
                  </div>
                </div>

                <div className="space-y-1 group/item">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-bold text-muted-foreground/60">
                      {t("Média de Volumes", "Média de Volumes")}
                    </span>
                    <span className="text-lg font-black tracking-tight">
                      {data?.routes.length
                        ? Math.round((data?.total || 0) / data.routes.length)
                        : 0}
                    </span>
                  </div>
                  <div className="h-[2px] w-full bg-border/10 overflow-hidden rounded-full">
                    <div className="h-full w-0 group-hover/item:w-full bg-primary/20 transition-all duration-700" />
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex justify-between items-end mb-3 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                      {t("Eficiência de Entrega", "Eficiência de Entrega")}
                    </span>
                    <span className="text-sm font-black text-primary">
                      {data?.total ? Math.round((data.byStatus.delivered / data.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden p-0.5 border border-border/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${data?.total ? (data.byStatus.delivered / data.total) * 100 : 0}%`,
                      }}
                      transition={{ duration: 1.5, ease: "circOut", delay: 1 }}
                      className="h-full bg-brand-gradient rounded-full shadow-[0_0_15px_rgba(255,140,0,0.3)]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="pt-2">
            <SystemTutorialVideo />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="pt-2"
          >
            <Card className="rounded-3xl border-border/10 bg-muted/20 overflow-hidden shadow-2xl">
              <CardContent className="p-6 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20">
                      <Zap className="h-5 w-5 text-primary animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm tracking-tight">Gerador de APK Local</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Servidor Autônomo</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black uppercase">Pronto</Badge>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <p className="text-[10px] font-black text-amber-600 uppercase mb-2 tracking-widest">Passo 1: Preparar Servidor</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                      Execute o script que criei para instalar o Java e o Android SDK automaticamente no seu Linux:
                    </p>
                    <div className="bg-black/40 p-3 rounded-xl font-mono text-[9px] text-amber-500 flex items-center justify-between border border-amber-500/5">
                      <code>bash setup-server.sh</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                        navigator.clipboard.writeText("bash setup-server.sh");
                        toast.success("Comando copiado!");
                      }}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <p className="text-[10px] font-black text-primary uppercase mb-2 tracking-widest">Passo 2: Gerar Aplicativo</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                      Após configurar, use este comando para compilar o instalador (.apk):
                    </p>
                    <div className="bg-black/40 p-3 rounded-xl font-mono text-[9px] text-primary flex items-center justify-between border border-primary/5">
                      <code>npm run mobile:build:android</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                        navigator.clipboard.writeText("npm run mobile:build:android");
                        toast.success("Comando copiado!");
                      }}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-[9px] text-center text-muted-foreground italic">
                    O arquivo será gerado em: /android/app/build/outputs/apk/release/
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
