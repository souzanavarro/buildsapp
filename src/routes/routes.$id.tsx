import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useRouteDetail } from "@/hooks/queries/useRouteQueries";
import { useRouteMutations } from "@/hooks/useRouteMutations";
import { deliveryService } from "@/services/api";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { hasRole, useAuth } from "@/hooks/use-auth";
import { totalRouteKm } from "@/lib/geo";
import { getStatusLabel, statusColor } from "@/lib/format";
import { 
  ArrowLeftIcon as ArrowLeft, PlayIcon as Play, SaveIcon as Save, Loader2, MapPinIcon as MapPin, PackageIcon as Package, 
  MapIcon, HashIcon as Hash, TrashIcon as Trash2, AlertTriangleIcon as AlertTriangle, ActivityIcon as Activity,
  CheckIcon as CheckSquare
} from "@/components/ui/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ROIAnalytics = lazy(() => import("@/components/analytics/ROIAnalytics").then(m => ({ default: m.ROIAnalytics })));
const RouteReplay = lazy(() => import("@/components/analytics/RouteReplay").then(m => ({ default: m.RouteReplay })));
import { useDeliveryGrouping } from "@/hooks/useDeliveryGrouping";
import { PremiumCard } from "@/components/ui/premium-card";
import { RouteStatItem } from "@/components/ui/route-stat-item";
import { PerformanceOverview } from "@/components/ui/performance-overview";
import { CostSimulator } from "@/components/ui/cost-simulator";
import { ManifestItem } from "@/components/ui/manifest-item";

export const Route = createFileRoute("/routes/$id")({ component: () => <AppShell><RouteDetail /></AppShell> });

function RouteDetail() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { roles } = useAuth();
  
  const [editingDistance, setEditingDistance] = useState(false);
  const [distanceInput, setDistanceInput] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { updateRoute, deleteRoute, isUpdating } = useRouteMutations();
  const { data, isLoading } = useRouteDetail(id);
  const groupedDeliveries = useDeliveryGrouping(data?.deliveries);

  const km = useMemo(() => {
    return totalRouteKm(
      groupedDeliveries
        .filter((d) => d.latitude != null && d.longitude != null)
        .map((d) => ({ id: d.id, lat: Number(d.latitude), lng: Number(d.longitude) })),
    );
  }, [groupedDeliveries]);

  const effectiveKm = useMemo(() => {
    const manual = (data?.route as any)?.total_distance;
    if (manual != null && Number(manual) > 0) return Number(manual);
    return km;
  }, [data?.route, km]);

  useEffect(() => {
    setDistanceInput(effectiveKm.toFixed(1));
  }, [effectiveKm]);

  const saveTolls = async (val: string) => {
    const value = parseFloat(val.replace(',', '.'));
    if (!(value >= 0)) {
      toast.error(t("Informe um valor válido para pedágios", "Informe um valor válido para pedágios"));
      return;
    }
    try {
      await updateRoute({ id, payload: { tolls_value: value } as any });
      toast.success(t("Pedágios atualizados", "Pedágios atualizados"));
    } catch (err) {}
  };

  const saveFreight = async (val: string) => {
    const value = parseFloat(val.replace(',', '.')) || 0;
    try {
      await updateRoute({ id, payload: { freight_value: value } });
      toast.success(t("Valor do frete atualizado!", "Valor do frete atualizado!"));
    } catch (err) {}
  };

  const saveDistance = async () => {
    const value = parseFloat(distanceInput.replace(',', '.'));
    if (!(value >= 0)) {
      toast.error(t("Informe uma distância válida", "Informe uma distância válida"));
      return;
    }
    try {
      await updateRoute({ id, payload: { total_distance: value } });
      toast.success(t("Distância atualizada", "Distância atualizada"));
      setEditingDistance(false);
    } catch (err) {}
  };

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    try {
      await deleteRoute({ id });
    } catch (err) {}
  };

  const handleMarkAllDelivered = async () => {
    const confirmed = window.confirm(t("Marcar todas as entregas como concluídas?", "Marcar todas as entregas como concluídas?"));
    if (!confirmed) return;
    
    try {
      await deliveryService.markAllAsDelivered(id);
      toast.success(t("Todas as entregas marcadas como concluídas!", "Todas as entregas marcadas como concluídas!"));
      qc.invalidateQueries({ queryKey: ["route", id] });
    } catch (err: any) {
      toast.error("Erro ao atualizar entregas: " + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-6 border-b border-border/10">
          <div className="flex items-center gap-6">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-10 w-72 rounded-xl" />
            </div>
          </div>
          <div className="flex gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-14 sm:w-40 rounded-2xl" />)}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <Skeleton className="h-32 rounded-[2.5rem]" />
              <Skeleton className="h-32 rounded-[2.5rem]" />
            </div>
            <Skeleton className="h-64 rounded-[2.5rem]" />
          </div>
          <Skeleton className="lg:col-span-2 h-[650px] rounded-[3rem]" />
        </div>
      </div>
    );
  }

  if (!data?.route) {
    return (
      <div className="flex flex-col items-center justify-center py-48 text-center bg-muted/5 rounded-[3rem] border-2 border-dashed border-border/10 max-w-2xl mx-auto px-6">
        <div className="bg-background p-10 rounded-full shadow-2xl mb-8 border border-border/10">
           <AlertTriangle className="h-16 w-16 text-muted-foreground/20" />
        </div>
        <h3 className="text-3xl font-black tracking-tighter mb-4">{t("Roteiro Indisponível", "Roteiro Indisponível")}</h3>
        <p className="text-muted-foreground font-medium text-lg mb-10 max-w-sm">
           {t("Este roteiro pode ter sido excluído ou não pertence à sua conta.", "Este roteiro pode ter sido excluído ou não pertence à sua conta.")}
        </p>
        <Link to="/routes">
           <Button variant="premium" className="rounded-2xl h-14 px-10">{t("Voltar para a Lista", "Voltar para a Lista")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-6 border-b border-border/10 relative overflow-hidden">
        <div className="flex items-center gap-6 relative z-10">
          <Link to="/routes">
            <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl bg-card/40 backdrop-blur-xl border-border/10 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-xl shadow-black/5 group">
               <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </Link>
          <div className="min-w-0 space-y-1">
             <div className="flex items-center gap-2 text-primary font-black text-[11px] uppercase tracking-[0.3em] bg-primary/5 w-fit px-3 py-1 rounded-full border border-primary/10 shadow-inner">
                <Hash className="h-3.5 w-3.5" /> {t("ID da Operação", "ID da Operação")}
             </div>
             <h1 className="text-4xl font-black tracking-tighter truncate max-w-[320px] sm:max-w-xl text-foreground leading-tight">
                {data.route.name}
             </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 relative z-10">
           <Badge className={cn(
             "text-[10px] font-black uppercase tracking-[0.25em] px-6 py-2 rounded-full border-none shadow-xl shrink-0 h-10 flex items-center", 
             statusColor[data.route.status] ?? "bg-muted text-muted-foreground"
           )}>
              {getStatusLabel(data.route.status, t)}
           </Badge>
           
           <Link to="/map" search={{ routeId: id }} className="flex-1 sm:flex-none">
             <Button variant="premium" className="w-full sm:w-auto h-14 px-10 group">
               <Play className="h-5 w-5 mr-3 fill-current group-hover:scale-110 transition-transform" /> 
               {t("Iniciar Trajeto Inteligente", "Iniciar Trajeto Inteligente")}
             </Button>
           </Link>

           <Button 
             variant="outline" 
             size="icon" 
             onClick={() => setShowDeleteDialog(true)}
             className="h-14 w-14 rounded-2xl border-border/10 bg-card/40 backdrop-blur-xl text-destructive hover:bg-destructive hover:text-white hover:border-destructive transition-all shadow-xl shadow-black/5 shrink-0"
           >
              <Trash2 className="h-6 w-6" />
           </Button>
        </div>
        <div className="absolute top-0 right-1/4 h-48 w-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
      </div>

      {hasRole(roles, "admin") && (
        <div className="space-y-10">
          <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-[2.5rem]" />}>
            <ROIAnalytics 
              totalFreight={data.route.freight_value || 0}
              totalDistance={effectiveKm}
            />
          </Suspense>
          
          <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-[2.5rem]" />}>
            <RouteReplay 
              points={data.deliveries
                .filter(d => d.latitude && d.longitude)
                .map(d => ({
                  latitude: Number(d.latitude),
                  longitude: Number(d.longitude),
                  speed: Math.random() * 60,
                  timestamp: d.delivered_at || new Date().toISOString()
                }))}
            />
          </Suspense>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        <div className="md:col-span-1 lg:col-span-4 space-y-8 lg:space-y-10">
           <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 lg:gap-6">

              <RouteStatItem 
                label={t("Volumes", "Volumes")}
                value={data.deliveries.length}
                icon={Package}
                size="lg"
              />
              <RouteStatItem 
                label={t("Distância", "Distância")}
                value={`${effectiveKm.toFixed(1)} km`}
                icon={MapIcon}
                size="lg"
                description={editingDistance ? undefined : t("clique para editar", "clique para editar")}
                className="cursor-pointer"
                onClick={() => !editingDistance && setEditingDistance(true)}
              />
           </div>

           <CostSimulator 
             freightValue={String(data.route.freight_value || "0")}
             tollsValue={String((data.route as any).tolls_value || "0")}
             onSaveFreight={saveFreight}
             onSaveTolls={saveTolls}
             isUpdating={isUpdating}
           />

           <PerformanceOverview 
             total={data.deliveries.length}
             delivered={data.deliveries.filter((d: any) => d.status === 'delivered').length}
             pending={data.deliveries.filter((d: any) => d.status === 'pending').length}
           />
        </div>

        <div className="md:col-span-1 lg:col-span-8 h-full">
           <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="h-full">
              <PremiumCard className="overflow-hidden flex flex-col h-full shadow-2xl min-h-[400px] xs:min-h-[500px] lg:min-h-[700px]">
                 <CardHeader className="bg-background/40 backdrop-blur-xl px-6 xs:px-10 py-6 xs:py-8 border-b border-border/5 flex flex-row items-center justify-between sticky top-0 z-20 gap-2">

                    <div className="space-y-1">
                       <CardTitle className="text-2xl font-black tracking-tighter flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                             <Activity className="h-6 w-6" />
                          </div>
                          {t("Manifesto de Carga", "Manifesto de Carga")}
                       </CardTitle>
                       <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.25em] pl-14 opacity-50">{t("Explorador de paradas", "Explorador de paradas")}</p>
                    </div>
                 </CardHeader>
                 
                  <CardContent className="p-0 flex-1 overflow-y-auto max-h-[800px] custom-scrollbar">
                    <div className="bg-muted/10 px-10 py-3 border-b border-border/5 flex items-center justify-between">
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("Ações em Massa", "Ações em Massa")}</p>
                       <Button variant="ghost" size="sm" className="h-8 gap-2 text-[10px] font-black uppercase text-primary hover:text-primary hover:bg-primary/10 rounded-full" onClick={handleMarkAllDelivered}>
                         <CheckSquare className="h-3.5 w-3.5" /> {t("Marcar Todas como OK", "Marcar Todas como OK")}
                       </Button>
                    </div>
                    <div className="divide-y divide-border/5">
                      {groupedDeliveries.map((d, i) => (
                        <ManifestItem key={d.id} delivery={d} index={i} />
                      ))}
                    </div>
                  </CardContent>
              </PremiumCard>
           </motion.div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-3xl border-border/20 p-10 backdrop-blur-3xl bg-background/90 shadow-2xl">
          <AlertDialogHeader className="space-y-6">
            <div className="h-24 w-24 rounded-[2rem] bg-destructive/10 flex items-center justify-center text-destructive mx-auto shadow-inner mb-2">
               <AlertTriangle className="h-10 w-10 animate-float" />
            </div>
            <div className="text-center space-y-2">
              <AlertDialogTitle className="text-3xl font-black tracking-tighter text-foreground leading-tight">
                 {t("Confirmar Exclusão?", "Confirmar Exclusão?")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-lg font-medium leading-relaxed px-2">
                 {t("Este roteiro será removido permanentemente. Todas as provas de entrega e métricas vinculadas serão perdidas.", "Este roteiro será removido permanentemente. Todas as provas de entrega e métricas vinculadas serão perdidas.")}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-4 sm:justify-center mt-10">
            <AlertDialogCancel className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[11px] border-border/40 hover:bg-accent transition-all">{t("Manter", "Manter")}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={isUpdating} className="rounded-2xl h-14 px-8 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-destructive/20 transition-all flex items-center gap-3 border-none">
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("Confirmar Exclusão", "Confirmar Exclusão")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
