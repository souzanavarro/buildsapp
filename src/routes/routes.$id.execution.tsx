import React, { useEffect, useState, useMemo, Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";

import { useQueryClient } from "@tanstack/react-query";
import { useRouteDetail } from "@/hooks/queries/useRouteQueries";
import { routeService, deliveryService, DeliveryStatus } from "@/services/api";
import { AppShell } from "@/components/app-shell";
import { syncService } from "@/services/sync-service";
import { Network } from "@capacitor/network";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Package,
  Target,
  Play,
  Square,
  Map as MapIcon,
  Loader2,
  Zap,
  ArrowUpDown,
  Crosshair,
  Navigation as NavIcon,
  Check,
  Menu,
  Settings as SettingsIcon,
  History,
  PlayCircle,
  User,
  LogOut,
  Clock,
  Share2,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { triggerRecenter, getNavSettings, onNavSettingsChange, NavSettings } from "@/lib/nav-settings";
import { useLocation } from "@/contexts/LocationContext";
import { getStatusLabel, statusColor } from "@/lib/format";
import { haversineKm, totalRouteKm, optimizeTelemetryRoute } from "@/lib/geo";
import { NavigationApps } from "@/components/execution/NavigationApps";
import { ExecutionMetrics } from "@/components/execution/ExecutionMetrics";
import { useDeliveryGrouping } from "@/hooks/useDeliveryGrouping";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ProofOfDeliveryForm } from "@/components/execution/ProofOfDeliveryForm";

const MapView = lazy(() => import("@/components/MapView").then((m) => ({ default: m.MapView })));

export const Route = createFileRoute("/routes/$id/execution")({
  component: () => (
    <AppShell>
      <ExecutionPage />
    </AppShell>
  ),
});

function ExecutionPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const qc = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMap, setShowMap] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [mode, setMode] = useState<string>("optimized");
  const [mapFilter, setMapFilter] = useState<string>("all");
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [replayMode, setReplayMode] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const arrivalNotifiedRef = React.useRef<Set<string>>(new Set());
  const stayTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState<string | null>(null);
  const [navSettings, setNavSettings] = useState<NavSettings>(() => getNavSettings());
  const { location } = useLocation();

  useEffect(() => onNavSettingsChange(setNavSettings), []);

  useEffect(() => {
    // Tracking is now handled globally via LocationProvider in __root.tsx
    return () => {
      if (wakeLock) {
        wakeLock.release().then(() => setWakeLock(null));
      }
    };
  }, [wakeLock]);

  const { data, isLoading } = useRouteDetail(id);

  const orderedDeliveries = useMemo(() => {
    const all = data?.deliveries ?? [];
    
    // Applying Telemetry Optimization if enabled
    let deliveriesToOrder = [...all];
    if (navSettings.telemetryOptimization) {
      const mapped = all.map(d => ({ 
        id: d.id, 
        lat: d.latitude != null ? Number(d.latitude) : null, 
        lng: d.longitude != null ? Number(d.longitude) : null,
        destination_address: d.destination_address 
      }));
      const optimizedIds = optimizeTelemetryRoute(mapped, location ? { id: 'current', lat: location.latitude, lng: location.longitude } : undefined);
      deliveriesToOrder = optimizedIds.map(id => all.find(d => d.id === id)).filter(Boolean) as any[];
      return deliveriesToOrder;
    }

    if (mode !== "nearest" || !location) return deliveriesToOrder;
    
    const pending = deliveriesToOrder.filter((d: any) => d.status !== "delivered" && d.status !== "problem");
    const done = deliveriesToOrder.filter((d: any) => d.status === "delivered" || d.status === "problem");
    pending.sort((a: any, b: any) => {
      if (a.latitude == null || a.longitude == null) return 1;
      if (b.latitude == null || b.longitude == null) return -1;
      const da = haversineKm(
        { lat: location.latitude, lng: location.longitude },
        { lat: Number(a.latitude), lng: Number(a.longitude) },
      );
      const db = haversineKm(
        { lat: location.latitude, lng: location.longitude },
        { lat: Number(b.latitude), lng: Number(b.longitude) },
      );
      return da - db;
    });
    return [...pending, ...done];
  }, [data?.deliveries, mode, location, navSettings.telemetryOptimization]);

  // Now handle Grouping for the UI
  const groupedDeliveries = useDeliveryGrouping(
    orderedDeliveries, 
    'optimized', 
    navSettings.groupByStreet ? 'street' : 'canonical'
  );

  // If grouping is enabled, our "stops" are the groups
  const finalDeliveries = navSettings.groupByStreet ? groupedDeliveries : orderedDeliveries;

  const currentStop = finalDeliveries[currentIndex] as any;

  const metrics = useMemo(() => {
    if (!finalDeliveries || finalDeliveries.length === 0) return null;

    let nextDist = "—";
    if (location && currentStop?.latitude && currentStop?.longitude) {
      nextDist = haversineKm(
        { lat: location.latitude, lng: location.longitude },
        { lat: Number(currentStop.latitude), lng: Number(currentStop.longitude) },
      ).toFixed(1);
    }

    const remainingStops = orderedDeliveries.slice(currentIndex).map((d: any) => ({
      id: d.id,
      lat: Number(d.latitude),
      lng: Number(d.longitude),
    }));

    let totalDist = totalRouteKm(remainingStops);
    if (location && remainingStops[0]) {
      totalDist += haversineKm(
        { lat: location.latitude, lng: location.longitude },
        { lat: remainingStops[0].lat, lng: remainingStops[0].lng },
      );
    }

    return {
      nextDistance: nextDist,
      totalDistance: totalDist.toFixed(1),
      remainingCount: remainingStops.length,
      progress:
        orderedDeliveries.length > 0
          ? ((orderedDeliveries.length - remainingStops.length) / orderedDeliveries.length) * 100
          : 0,
    };
  }, [orderedDeliveries, currentIndex, location, currentStop]);

  const [hasSetInitialIndex, setHasSetInitialIndex] = useState(false);

  useEffect(() => {
    if (orderedDeliveries.length && !hasSetInitialIndex) {
      const firstPending = orderedDeliveries.findIndex(
        (d) => d.status === "pending" || d.status === "in_route",
      );
      setCurrentIndex(firstPending >= 0 ? firstPending : 0);
      setHasSetInitialIndex(true);
    }
  }, [orderedDeliveries, hasSetInitialIndex]);

  const etaMinutes = useMemo(() => {
    if (!metrics?.totalDistance) return 0;
    const dist = parseFloat(metrics.totalDistance);
    const remainingStopsCount = orderedDeliveries.filter(
      (d: any) => d.status === "pending" || d.status === "in_route",
    ).length;


    // Adjust factor based on typical city traffic if we don't have real-time matrix here
    // but the totalDistance already comes from a route that can be traffic-aware
    const trafficFactor = 2.5; // minutes per km in moderate traffic
    return remainingStopsCount * 3 + dist * trafficFactor;
  }, [orderedDeliveries, metrics?.totalDistance]);

  const etaText = useMemo(() => {
    if (etaMinutes <= 0) return "0 min";
    if (etaMinutes > 60) {
      const h = Math.floor(etaMinutes / 60);
      const m = Math.round(etaMinutes % 60);
      return `${h}h ${m}m`;
    }
    return `${Math.round(etaMinutes)} min`;
  }, [etaMinutes]);

  const handleSetMode = (m: string) => {
    setMode(m);
    setShowMenu(false);
    if (m === "navigating") {
      toast.info(t("Modo de navegação ativado", "Modo de navegação ativado"));
    }
  };

  const handleStartRoute = async () => {
    try {
      await routeService.updateRoute(id, { status: "in_progress" });
      toast.success(t("Roteiro iniciado!", "Roteiro iniciado!"));

      // Request Wake Lock
      if ("wakeLock" in navigator) {
        try {
          const lock = await (navigator as any).wakeLock.request("screen");
          setWakeLock(lock);
          console.log("Wake Lock active");
        } catch (err: any) {
          console.error(`${err.name}, ${err.message}`);
        }
      }

      qc.invalidateQueries({ queryKey: ["route-execution", id] });
    } catch (e: any) {
      toast.error("Erro ao iniciar rota: " + e.message);
    }
  };

  const handleShareRoute = async () => {
    const pending = orderedDeliveries
      .filter((d: any) => d.status !== "delivered" && d.status !== "problem")
      .slice(0, 10);

    if (pending.length === 0) return toast.error("Nenhuma parada pendente");

    const dest = pending[pending.length - 1];
    const wp = pending
      .slice(0, -1)
      .map((s: any) => `${s.latitude},${s.longitude}`)
      .join("|");

    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.latitude},${dest.longitude}${wp ? `&waypoints=${encodeURIComponent(wp)}` : ""}&travelmode=driving`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Roteiro de entregas",
          text: `Roteiro com ${pending.length} paradas`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t("Link copiado!", "Link copiado!"));
        window.open(url, "_blank");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkDelivered = async (deliveryId: string) => {
    if (!deliveryId) return;
    setConfirmingDeliveryId(deliveryId);
  };

  const handleStatusUpdate = async (status: "delivered" | "problem") => {
    if (!currentStop) return;
    
    // If it's a group, we handle it slightly differently
    const deliveryIds = currentStop.isGroup 
      ? currentStop.groupedItems.map((i: any) => i.id)
      : [currentStop.id];

    if (status === "delivered") {
      setConfirmingDeliveryId(currentStop.id);
      return;
    }

    try {
      const net = await Network.getStatus();
      const deliveredAt = null;

      if (!net.connected) {
        for (const dId of deliveryIds) {
          await syncService.addToQueue("delivery_update", { id: dId, status, delivered_at: deliveredAt });
        }

        // Optimistic update
        qc.setQueryData(["route", id], (old: any) => {
           if (!old || !old.deliveries) return old;
           return {
             ...old,
             deliveries: old.deliveries.map((d: any) => 
               deliveryIds.includes(d.id) ? { ...d, status, delivered_at: deliveredAt } : d
             )
           };
        });
      } else {
        // Bulk update via supabase directly if possible, or loop
        for (const dId of deliveryIds) {
          await deliveryService.updateDeliveryStatus(dId, status as DeliveryStatus);
        }
      }

      if (window.navigator.vibrate) {
        window.navigator.vibrate(200);
      }

      toast.success(t("Problema registrado", "Problema registrado"));

      if (currentIndex < finalDeliveries.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }

      qc.invalidateQueries({ queryKey: ["route-execution", id] });
    } catch (e: any) {
      toast.error("Erro ao atualizar status: " + e.message);
    }
  };

  const handleMarkAllDelivered = async () => {
    try {
      await deliveryService.markAllAsDelivered(id);
      toast.success(t("Todas as entregas marcadas como concluídas!", "Todas as entregas marcadas como concluídas!"));
      qc.invalidateQueries({ queryKey: ["route-execution", id] });
      qc.invalidateQueries({ queryKey: ["route", id] });
    } catch (e: any) {
      toast.error("Erro ao atualizar entregas: " + e.message);
    }
  };


  useEffect(() => {
    if (
      mode === "navigating" &&
      location &&
      currentStop &&
      !arrivalNotifiedRef.current.has(currentStop.id)
    ) {
      if (currentStop.latitude && currentStop.longitude) {
        const dist = haversineKm(
          { lat: location.latitude, lng: location.longitude },
          { lat: Number(currentStop.latitude), lng: Number(currentStop.longitude) },
        );
        
        // Immediate notification if very close (< 60m)
        if (dist <= 0.06) {
          if (!stayTimerRef.current) {
            // Start a 1-minute timer if stationary or very slow near the stop
            stayTimerRef.current = setTimeout(() => {
              toast.info("Parece que você chegou!", {
                description: `Você está parado próximo a ${currentStop.destination_address}. Deseja finalizar agora?`,
                action: {
                  label: "Finalizar",
                  onClick: () => handleMarkDelivered(currentStop.id),
                },
                duration: 15000,
              });
            }, 60000); // 1 minute
          }

          if (dist <= 0.03) { // Even closer (30m) - immediate notification
            arrivalNotifiedRef.current.add(currentStop.id);
            toast("Você chegou!", {
              description: `Destino: ${currentStop.destination_address}`,
              action: {
                label: "Marcar entregue",
                onClick: () => handleMarkDelivered(currentStop.id),
              },
              duration: 10000,
            });
          }
        } else {
          // Clear timer if we move away
          if (stayTimerRef.current) {
            clearTimeout(stayTimerRef.current);
            stayTimerRef.current = null;
          }
        }
      }
    }

    return () => {
      if (stayTimerRef.current) {
        clearTimeout(stayTimerRef.current);
        stayTimerRef.current = null;
      }
    };
  }, [location, currentStop, mode]);

  if (isLoading || !data?.route) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("Carregando execução...", "Carregando execução...")}</p>
      </div>
    );
  }

  const remainingStopsCount = finalDeliveries.filter(
    (d: any) => d.status === "pending" || d.status === "in_route",
  ).length;

  const totalStopsCount = finalDeliveries.length;
  const progressPercent =
    totalStopsCount > 0 ? ((totalStopsCount - remainingStopsCount) / totalStopsCount) * 100 : 0;

  const stopsForMap = useMemo(() => {
    let list: any[] = finalDeliveries || [];
    
    if (mapFilter.startsWith("next")) {
      const limit = parseInt(mapFilter.replace("next", ""), 10);
      list = list.slice(0, limit);
    } else if (mapFilter === "pending") {
      list = list.filter(d => d.status !== 'delivered' && d.status !== 'problem');
    } else if (mapFilter === "problem") {
      list = list.filter(d => d.status === 'problem');
    }

    return list.map((d: any, i: number) => ({
      id: d.id,
      latitude: d.latitude ? Number(d.latitude) : NaN,
      longitude: d.longitude ? Number(d.longitude) : NaN,
      status: d.status,
      sequence: d.stop ?? d.sequence ?? i + 1,
      isGroup: d.isGroup,
      totalItems: d.totalItems,
      itemsDelivered: d.itemsDelivered,
      destination_address: d.destination_address,
      neighborhood: d.neighborhood
    }));
  }, [finalDeliveries, mapFilter]);


  const isRouteInProgress = data.route.status === "in_progress";

  const modes = [
    { key: "optimized", label: t("Otimizado", "Otimizado"), icon: Zap },
    { key: "nearest", label: t("Mais Próxima", "Mais Próxima"), icon: ArrowUpDown },
    { key: "focus", label: t("Focando", "Focando"), icon: Crosshair },
    { key: "navigating", label: t("Navegando", "Navegando"), icon: NavIcon },

  ];
  const followUser = mode === "focus" || mode === "navigating";

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50 dark:bg-slate-950 lg:flex-row">
      <div
        className={cn(
          "bg-card border-b lg:border-b-0 lg:border-r z-30 shadow-sm relative transition-all duration-300 lg:w-80 xl:w-96 lg:h-full overflow-y-auto",
          isRouteInProgress ? "p-3" : "p-4",
        )}
      >
        <div className="flex items-center justify-between mb-3 gap-2">
          {!isRouteInProgress && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setShowMenu(!showMenu)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <div className="flex-1">
            <Button
              className={cn(
                "w-full h-10 gap-2 font-bold shadow-md transition-all rounded-full",
                !isRouteInProgress
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white",
              )}
              onClick={!isRouteInProgress ? handleStartRoute : () => {}}
            >
              {isRouteInProgress ? (
                <>
                  <NavIcon className="h-4 w-4 fill-current animate-pulse" />
                  <span>{t("EM ROTA", "EM ROTA")} · {remainingStopsCount} {t("PARADAS", "PARADAS")}</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>{t("INICIAR ROTA", "INICIAR ROTA")}</span>
                </>
              )}
            </Button>
          </div>

          {!isRouteInProgress && (
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0"
              onClick={() => triggerRecenter()}
            >
              <Target className="h-5 w-5" />
            </Button>
          )}

          {isRouteInProgress && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0"
              onClick={() => setShowMenu(!showMenu)}
            >
              <SettingsIcon className="h-5 w-5" />
            </Button>
          )}
        </div>

        {showMenu && (
          <div className="absolute top-16 left-4 right-4 bg-card border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-3 border-b bg-muted/30 flex justify-between items-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("Opções do Roteiro", "Opções do Roteiro")}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowMenu(false)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col py-1">
              <button
                onClick={() => {
                  navigate({ to: "/dashboard" });
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent text-sm transition-colors"
              >
                <NavIcon className="h-4 w-4 text-primary" />
                <span>{t("Ir para Dashboard", "Ir para Dashboard")}</span>
              </button>
              <button
                onClick={() => {
                  navigate({ to: `/routes/${id}` });
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-primary" />
                <span>{t("Voltar ao Roteiro", "Voltar ao Roteiro")}</span>
              </button>
              <button
                onClick={() => {
                  handleShareRoute();
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent text-sm transition-colors"
              >
                <Share2 className="h-4 w-4 text-primary" />
                 <span>{t("Compartilhar Roteiro", "Compartilhar Roteiro")}</span>
              </button>
              <button
                onClick={() => {
                  setReplayMode(!replayMode);
                  setShowMenu(false);
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 hover:bg-accent text-sm transition-colors",
                  replayMode && "bg-primary/10 text-primary font-bold"
                )}
              >
                <PlayCircle className="h-4 w-4" />
                <span>{replayMode ? t("Desativar Replay", "Desativar Replay") : t("Replay de Telemetria", "Replay de Replay")}</span>
              </button>
              <div className="px-4 py-2 border-t mt-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">
                  {t("Modo de Exibição", "Modo de Exibição")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {modes.map((m: any) => (
                    <Button
                      key={m.key}
                      variant={mode === m.key ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-[10px] gap-1"
                      onClick={() => handleSetMode(m.key)}
                    >
                      <m.icon className="h-3 w-3" />
                      {m.label}
                    </Button>
                  ))}
                </div>
              </div>
              <button
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent text-sm transition-colors text-destructive border-t mt-1"
                onClick={() => {
                  setShowMenu(false);
                  supabase.auth.signOut().then(() => navigate({ to: "/auth" }));
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>{t("Sair do Aplicativo", "Sair do Aplicativo")}</span>
              </button>
            </div>
          </div>
        )}

        {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}

        {!isRouteInProgress && (
          <ExecutionMetrics
            totalDistance={metrics?.totalDistance}
            nextDistance={metrics?.nextDistance}
          />
        )}

        <div className="space-y-1.5">
          <div className="flex justify-between items-end px-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Progresso: {Math.round(progressPercent)}%
            </span>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1">
              <Clock className="h-3 w-3" /> ETA: {etaText}
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 lg:pb-4 lg:flex lg:flex-col">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 text-[10px] font-bold uppercase rounded-full bg-background shadow-sm"
            onClick={() => setShowMap(!showMap)}
          >
            <MapIcon className="h-3.5 w-3.5" />
            {showMap ? "Ocultar Mapa" : "Ver Mapa"}
          </Button>
          <Badge
            variant="secondary"
            className="font-mono text-[10px] px-3 py-1 rounded-full border-primary/20 bg-primary/5 text-primary"
          >
            {currentIndex + 1} de {totalStopsCount}
          </Badge>
        </div>

        {showMap && (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-[250px] lg:h-[400px] xl:flex-1 w-full rounded-2xl overflow-hidden border-2 border-background shadow-lg bg-muted relative"
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="animate-spin" />
                </div>
              }
            >
              <MapView
                stops={stopsForMap}
                userLocation={location}
                activeStopIndex={currentIndex}
                routePhase={data.route.status === "in_progress" ? "navigating" : "idle"}
                followUser={followUser}
                onFilterChange={setMapFilter}
              />
            </Suspense>
            {isRouteInProgress && (
              <div className="absolute top-3 left-3 flex gap-2">
                <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg animate-pulse">
                  <NavIcon className="h-4 w-4" />
                </div>
                <div className="bg-background/90 backdrop-blur-sm border px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">
                  NAVEGANDO ATÉ A PARADA {currentIndex + 1}
                </div>
              </div>
            )}
            {isRouteInProgress && (
              <div
                className="absolute top-3 right-3 bg-blue-600 text-white p-2 rounded-full shadow-lg"
                onClick={() => triggerRecenter()}
              >
                <Crosshair className="h-4 w-4" />
              </div>
            )}
          </motion.div>
        )}

        {currentStop ? (
          <>
            <motion.div
              layout
              className={cn(
                "p-4 rounded-2xl border transition-all shadow-sm",
                isRouteInProgress
                  ? "bg-blue-600 border-blue-500 text-white shadow-blue-500/20"
                  : "bg-card border-border",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-1 p-2 rounded-full shrink-0 shadow-sm",
                    isRouteInProgress ? "bg-white/20" : "bg-primary/10",
                  )}
                >
                  <MapPin
                    className={cn("h-6 w-6", isRouteInProgress ? "text-white" : "text-primary")}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black leading-tight break-words">
                    {currentStop.isGroup 
                      ? `${currentStop.destination_address} (${currentStop.totalItems} entregas)` 
                      : currentStop.destination_address}
                  </h2>
                  <p
                    className={cn(
                      "text-sm font-medium mt-0.5 opacity-90",
                      isRouteInProgress ? "text-blue-50" : "text-muted-foreground",
                    )}
                  >
                    {currentStop.neighborhood}, {currentStop.city}
                  </p>
                </div>
                <Badge
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-bold border",
                    isRouteInProgress
                      ? "bg-white/20 border-white/20 text-white"
                      : statusColor[currentStop.status],
                  )}
                >
                  {getStatusLabel(currentStop.status, t)}
                </Badge>
              </div>

              <div
                className={cn(
                  "mt-4 p-3 rounded-xl border flex items-center justify-between",
                  isRouteInProgress
                    ? "bg-white/10 border-white/10"
                    : "bg-muted/30 border-muted-foreground/10",
                )}
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 opacity-70" />
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    {currentStop.isGroup ? t("Múltiplos Pacotes", "Múltiplos Pacotes") : t("Pacote SPX", "Pacote SPX")}
                  </span>
                </div>
                <span className="font-mono font-bold text-sm tracking-tight">
                  {currentStop.isGroup 
                    ? `${currentStop.itemsDelivered}/${currentStop.totalItems}` 
                    : (currentStop.spx_tn ?? t("SEM CÓDIGO", "SEM CÓDIGO"))}
                </span>
              </div>
            </motion.div>

            <NavigationApps
              latitude={Number(currentStop.latitude)}
              longitude={Number(currentStop.longitude)}
              address={currentStop.destination_address}
              userLocation={location}
              pendingStops={orderedDeliveries
                .slice(currentIndex)
                .filter(
                  (d) =>
                    d.status !== "delivered" &&
                    d.status !== "problem" &&
                    d.latitude != null &&
                    d.longitude != null,
                )
                .map((d) => ({ latitude: Number(d.latitude), longitude: Number(d.longitude) }))}
            />

            <div className="grid grid-cols-2 gap-4 pt-2">
              <Button
                variant="outline"
                className="h-20 flex-col gap-1 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-2xl bg-white dark:bg-slate-900"
                onClick={() => handleStatusUpdate("problem")}
              >
                <AlertCircle className="h-6 w-6" />
                <span className="font-bold uppercase text-[10px]">Problema</span>
              </Button>
              <Button
                variant="default"
                className="h-20 flex-col gap-1 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20 rounded-2xl border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
                onClick={() => handleStatusUpdate("delivered")}
              >
                <CheckCircle2 className="h-8 w-8" />
                <span className="font-black uppercase">CONCLUIR</span>
              </Button>
            </div>

            <div className="pt-4">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>Próximas Paradas</span>
                  <button 
                    onClick={handleMarkAllDelivered}
                    className="flex items-center gap-1 text-primary hover:underline bg-primary/5 px-2 py-0.5 rounded-full"
                  >
                    <CheckSquare className="h-3 w-3" />
                    TUDO OK
                  </button>
                </div>
                <span>{remainingStopsCount} pendentes</span>
              </div>
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {finalDeliveries.map((d: any, idx) => {
                    const isCurrent = idx === currentIndex;
                    const isDone = d.status === "delivered";
                    const isProblem = d.status === "problem";
                    const isGroup = d.isGroup;
                    const dist =
                      location && d.latitude && d.longitude
                        ? haversineKm(
                            { lat: location.latitude, lng: location.longitude },
                            { lat: Number(d.latitude), lng: Number(d.longitude) },
                          ).toFixed(1)
                        : null;

                    if (isDone && !isCurrent) return null;

                    return (
                      <motion.div
                        key={d.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => setCurrentIndex(idx)}
                        className={cn(
                          "relative group flex items-center gap-3 pl-2 pr-3 py-3 rounded-2xl border-2 cursor-pointer transition-all overflow-hidden",
                          isCurrent
                            ? "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800 shadow-md ring-2 ring-blue-500/20"
                            : "bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800 hover:border-slate-300",
                          isDone && "opacity-60 grayscale border-slate-200",
                        )}
                      >
                        <div className="absolute inset-y-0 left-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm shrink-0 shadow-sm",
                            isDone
                              ? "bg-green-600 text-white"
                              : isProblem
                                ? "bg-destructive text-white"
                                : isCurrent
                                  ? "bg-blue-600 text-white animate-pulse"
                                  : "bg-slate-800 dark:bg-slate-700 text-white",
                          )}
                        >
                          {isDone ? (
                            <Check className="h-5 w-5" />
                          ) : isProblem ? (
                            <AlertCircle className="h-5 w-5" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-bold leading-tight truncate",
                              isCurrent ? "text-blue-700 dark:text-blue-400" : "text-foreground",
                              isDone && "line-through text-muted-foreground",
                            )}
                          >
                            {isGroup ? `${d.destination_address} (${d.totalItems} entregas)` : d.destination_address}
                          </p>
                          <p className="text-[10px] font-medium text-muted-foreground truncate mt-1">
                            {d.neighborhood}
                            {d.city ? ` · ${d.city}` : ""}
                            {dist ? ` · ${dist} km` : ""}
                          </p>
                        </div>

                        {!isDone && !isProblem && (
                          <motion.div whileTap={{ scale: 0.9 }} className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className={cn(
                                "h-10 w-10 rounded-full shrink-0 transition-colors",
                                isCurrent
                                  ? "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30",
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkDelivered(d.id);
                              }}
                            >
                              <Check className="h-5 w-5" strokeWidth={3} />
                            </Button>
                          </motion.div>
                        )}
                        {(isDone || isProblem) && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50" />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="bg-muted rounded-full w-20 h-20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-bold text-muted-foreground">Nenhuma entrega restante!</p>
            <Button onClick={() => navigate({ to: "/dashboard" })}>Voltar ao Início</Button>
          </div>
        )}
      </div>

      <div className="p-4 bg-background/95 backdrop-blur-md border-t flex items-center justify-between z-20 pb-8 lg:pb-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 px-4 font-bold text-xs gap-1 rounded-xl"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => prev - 1)}
        >
          <ChevronLeft className="h-5 w-5" />
          ANTERIOR
        </Button>
        <div className="flex gap-1.5 px-4">
          {orderedDeliveries
            .slice(
              Math.max(0, currentIndex - 1),
              Math.min(orderedDeliveries.length, currentIndex + 2),
            )
            .map((_, i) => {
              const realIdx = Math.max(0, currentIndex - 1) + i;
              return (
                <div
                  key={realIdx}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    realIdx === currentIndex
                      ? "bg-blue-500 w-6"
                      : "bg-slate-200 dark:bg-slate-800 w-2",
                  )}
                />
              );
            })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 px-4 font-bold text-xs gap-1 rounded-xl"
          disabled={currentIndex === orderedDeliveries.length - 1}
          onClick={() => setCurrentIndex((prev) => prev + 1)}
        >
          PRÓXIMA
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Proof of Delivery Drawer */}
      <Drawer
        open={!!confirmingDeliveryId}
        onOpenChange={(o) => !o && setConfirmingDeliveryId(null)}
      >
        <DrawerContent className="max-h-[95vh] rounded-t-[2rem]">
          {confirmingDeliveryId && (
            <ProofOfDeliveryForm
              deliveryIds={
                currentStop.isGroup 
                  ? currentStop.groupedItems.map((i: any) => i.id) 
                  : [confirmingDeliveryId]
              }
              expectedSpxTn={
                currentStop.isGroup 
                  ? undefined 
                  : currentStop.spx_tn
              }

              onComplete={() => {
                setConfirmingDeliveryId(null);
                if (
                  currentIndex < orderedDeliveries.length - 1 &&
                  confirmingDeliveryId === currentStop?.id
                ) {
                  setCurrentIndex((prev) => prev + 1);
                }
                qc.invalidateQueries({ queryKey: ["route-execution", id] });
              }}
              onCancel={() => setConfirmingDeliveryId(null)}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
