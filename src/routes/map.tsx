import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DeliveryItem } from "@/components/DeliveryItem";
import { lazy, Suspense, useEffect, useMemo, useCallback, useState, useRef, memo } from "react";
import { AppShell } from "@/components/app-shell";
const MapView = lazy(() =>
  import("@/components/MapView").then((mod) => ({ default: mod.MapView })),
);
import { type MapStop } from "@/components/MapView";
import { speakInstruction } from "@/lib/nav-settings";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { useLocation } from "@/contexts/LocationContext";
import { Card, CardContent } from "@/components/ui/card";
import { ScanIcon as ScanLine, MenuIcon as ListIcon, SearchIcon, MapPinIcon as MapPin } from "@/components/ui/icons";
import { WazeIcon } from "@/components/ui/WazeIcon";
import { Button } from "@/components/ui/button";
import { useMapLogic } from "@/features/map/useMapLogic";
import { MapHeader } from "@/features/map/MapHeader";
import { DeliveryListDrawer } from "@/features/map/DeliveryListDrawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { X, Loader2, Trash2, AlertTriangle, Truck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouteMutations } from "@/hooks/useRouteMutations";
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

import { OptimizationOverlay } from "@/features/map/OptimizationOverlay";
import { StopDetailsCard } from "@/features/map/StopDetailsCard";
import { useCustomerNotesByAddresses } from "@/lib/customer-notes";
import { canonicalizeAddress } from "@/lib/address-utils";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";

const ProofOfDeliveryForm = lazy(() =>
  import("@/components/execution/ProofOfDeliveryForm").then((mod) => ({
    default: mod.ProofOfDeliveryForm,
  })),
);

export const Route = createFileRoute("/map")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      routeId: (search.routeId as string) || undefined,
    };
  },
  component: () => (
    <AppShell transitionType="parallax">
      <MapPage />
    </AppShell>
  ),
});

function MapPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { routeId } = Route.useSearch();

  const { formattedRange } = useDateFilter();
  const { location: userLocation } = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { deleteRoute, isDeleting } = useRouteMutations();

  const {
    selectedStopId,
    setSelectedStopId,
    detailStopId,
    setDetailStopId,
    optimizing,
    optimizeRoute,
    navigating,
    startNavigation,
    stopNavigation,
    searchTerm,
    setSearchTerm,
    isScanningSearch,
    setIsScanningSearch,
    isListDrawerOpen,
    setIsListDrawerOpen,
    optimizationProgress,
    optimizationStage,
    viewMode,
    showDelivered,
    setShowDelivered,
    confirmingDeliveryId,
    setConfirmingDeliveryId,
    mapFilter,
    setMapFilter,
    activeScopeStops,
    setActiveScopeStops,
    availableRoutes,
    deliveries,
    isLoading,
    filteredDeliveries,
    groupedDeliveries,
    updateDeliveryStatus,
    onRecenter,
    markAllAsDelivered,
    resetOptimization,
    compactMode,
    setCompactMode,
  } = useMapLogic(routeId, formattedRange);

  useEffect(() => {
    if (!routeId && availableRoutes && availableRoutes.length > 0) {
      navigate({ to: "/map", search: { routeId: availableRoutes[0].id } });
    }
  }, [availableRoutes, routeId, navigate]);

  const allAddresses = useMemo(
    () => (groupedDeliveries ?? []).map((g) => g.destination_address),
    [groupedDeliveries]
  );
  const notesByKey = useCustomerNotesByAddresses(allAddresses);

  const stops: MapStop[] = useMemo(() => {
    let base = (groupedDeliveries ?? []);
    if (base.length === 0) return [];

    if (mapFilter === "pending") {
      base = base.filter((g) => g.groupedItems.some((i: any) => i.status !== "delivered" && i.status !== "problem"));
    } else if (mapFilter === "problem") {
      base = base.filter((g) => g.groupedItems.some((i: any) => i.status === "problem"));
    } else if (mapFilter === "scope") {
      base = base.filter((g) => activeScopeStops.includes(g.id));
    } else if (mapFilter.startsWith("next")) {
      const limit = parseInt(mapFilter.replace("next", ""), 10);
      const pending = base
        .filter((g) => g.groupedItems.some((i: any) => i.status !== "delivered" && i.status !== "problem"));
      if (pending.length > 0) base = pending.slice(0, limit);
    } else if (mapFilter.startsWith("range-")) {
      const parts = mapFilter.replace("range-", "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        base = base.slice(start - 1, end);
      }
    } else if (!showDelivered) {
      base = base.filter((g) => g.groupedItems.some((i: any) => i.status !== "delivered"));
    }

    return (base
      .map((d: any) => {
        if (!d) return null;
        const isDelivered = d.status === "delivered" || d.status === "problem";
        const shopeeStop = d.stop ?? d.original_sequence ?? d.sequence ?? 0;
        const displaySequence = viewMode === "optimized"
          ? (isDelivered ? shopeeStop : (d.sequence ?? 0))
          : shopeeStop;

        const key = canonicalizeAddress(d.destination_address);
        const hasCustomerNotes = key ? (notesByKey.get(key)?.length ?? 0) > 0 : false;

        return {
          id: String(d.id),
          latitude: d?.latitude ? Number(d.latitude) : NaN,
          longitude: d?.longitude ? Number(d.longitude) : NaN,
          status: d?.status || "pending",
          sequence: Number(displaySequence),
          originalSequence: d.stop ?? d.original_sequence ?? undefined,
          destination_address: String(d.destination_address || ""),
          neighborhood: d.neighborhood || undefined,
          isGroup: !!d.isGroup,
          totalItems: Number(d.totalItems || 0),
          itemsDelivered: Number(d.itemsDelivered || 0),
          hasCustomerNotes,
        };
      })
      .filter((s) => s !== null) as MapStop[])
      .sort((a, b) => (a.sequence || 999) - (b.sequence || 999));
  }, [groupedDeliveries, viewMode, showDelivered, mapFilter, notesByKey]);

  const selectedStop = useMemo(
    () => groupedDeliveries?.find((d) => d.id === selectedStopId),
    [groupedDeliveries, selectedStopId],
  );

  const handleSelectStop = useCallback(
    (id: string) => {
      setSelectedStopId((prev) => (prev === id ? null : id));
    },
    [setSelectedStopId],
  );

  const handleDeleteRoute = async () => {
    if (!routeId) return;
    try {
      await deleteRoute({ id: routeId });
      setShowDeleteDialog(false);
    } catch {
      // Handled by mutation
    }
  };

  return (
    <div className="relative w-full h-full bg-background z-0 overflow-hidden flex flex-col">
      <PermissionGuard />
      
      {/* Map Layer - Fixed large height */}
      <div className="h-[50vh] min-h-[400px] relative z-0">
        <Suspense
          fallback={
            <div className="w-full h-full bg-muted/20 animate-pulse flex flex-col items-center justify-center gap-4">
              <div className="p-5 rounded-[32px] bg-primary/10 animate-bounce">
                <Truck className="h-12 w-12 text-primary shadow-2xl" />
              </div>
              <div className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground animate-pulse">{t("Sincronizando Satélites...", "Sincronizando Satélites...")}</div>
            </div>
          }
        >
          <MapView
            stops={stops}
            userLocation={userLocation || undefined}
            onStopClick={(stop) => handleSelectStop(stop.id)}
            onMapClick={() => setSelectedStopId(null)}
            routePhase={navigating ? "navigating" : "idle"}
            onOpenList={() => setIsListDrawerOpen(true)}
            onScanClick={() => setIsScanningSearch(true)}
            onAutoArrival={(id) => updateDeliveryStatus(id, "delivered")}
            showDelivered={showDelivered}
            onToggleShowDelivered={() => setShowDelivered(!showDelivered)}
            onFilterChange={setMapFilter}
          >
            <OptimizationOverlay
              optimizing={optimizing}
              progress={optimizationProgress}
              stage={optimizationStage}
            />

            <StopDetailsCard
              stop={selectedStop}
              customerNotes={selectedStop ? (notesByKey.get(canonicalizeAddress(selectedStop.destination_address)) ?? []) : []}
              onClose={() => setSelectedStopId(null)}
              onStatusUpdate={updateDeliveryStatus}
              onConfirmDelivery={setConfirmingDeliveryId}
              pendingStops={stops.filter(s => s.status !== 'delivered' && s.status !== 'problem')}
            />
          </MapView>
        </Suspense>

      </div>

      {/* Info & Search Panel - Fixed position below map */}
      <div className="flex-1 overflow-y-auto bg-background z-10">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full p-4 pb-10 space-y-6"
        >
          {/* Operational Map Info */}
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-card/50 p-4 rounded-[24px] border border-border/10">
              <MapHeader
                isLoading={isLoading}
                routeId={routeId}
                availableRoutes={availableRoutes}
                deliveries={deliveries}
                optimizing={optimizing}
                navigating={navigating}
                viewMode={viewMode}
                isDeletingRoute={isDeleting}
                onOptimize={optimizeRoute}
                onResetOptimization={resetOptimization}
                onStartNav={startNavigation}
                onStopNav={stopNavigation}
                onDeleteRoute={() => setShowDeleteDialog(true)}
              />
            </div>
          </div>

          {/* Search Box */}
          <div className="w-full max-w-4xl mx-auto">
            <div className="group relative">
              <div className="bg-muted/30 h-12 md:h-14 px-4 rounded-full border border-border/10 flex items-center gap-3">
                <SearchIcon className="h-4 w-4 text-muted-foreground/40" />
                <input
                  className="flex-1 bg-transparent border-none outline-none font-bold text-xs xs:text-sm placeholder:text-muted-foreground/30 min-w-0 text-foreground"
                  placeholder={t("Buscar encomenda ou endereço...", "Buscar encomenda ou endereço...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-muted/50" 
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Deliveries List - Scopes of 10 */}
          <div className="w-full max-w-4xl mx-auto space-y-6">
            {filteredDeliveries && filteredDeliveries.length > 0 ? (
              <div className="space-y-8">
                {Array.from({ length: Math.ceil(filteredDeliveries.length / 10) }).map((_, scopeIndex) => {
                  const start = scopeIndex * 10 + 1;
                  const end = Math.min((scopeIndex + 1) * 10, filteredDeliveries.length);
                  return (
                    <ScopeSection 
                      key={scopeIndex}
                      scopeIndex={scopeIndex}
                      scopeTitle={`Entregas do ${start} ao ${end}`}
                      scopeDeliveries={filteredDeliveries.slice(scopeIndex * 10, (scopeIndex + 1) * 10)}
                    selectedStopId={selectedStopId}
                    mapFilter={mapFilter}
                    activeScopeStops={activeScopeStops}
                    setMapFilter={setMapFilter}
                    setActiveScopeStops={setActiveScopeStops}
                    setSelectedStopId={setSelectedStopId}
                    onRecenter={onRecenter}
                    updateDeliveryStatus={updateDeliveryStatus}
                    t={t}
                  />
                );
              })}
              </div>
            ) : (
              !isLoading && (
                <div className="text-center py-12 bg-muted/5 rounded-[32px] border border-dashed border-border/20">
                  <div className="h-16 w-16 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-4">
                    <Truck className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground/40">{t("Nenhuma entrega encontrada para este roteiro", "Nenhuma entrega encontrada para este roteiro")}</span>
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>

      {/* Dialogs & Drawers */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-[40px] border-border/10 glass p-10 max-w-sm">
          <AlertDialogHeader className="space-y-6">
            <div className="h-20 w-20 rounded-[28px] bg-destructive/10 flex items-center justify-center text-destructive mx-auto shadow-inner">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <div className="text-center space-y-2">
              <AlertDialogTitle className="text-2xl font-black tracking-tight">
                {t("Apagar Roteiro?", "Apagar Roteiro?")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium text-sm leading-relaxed">
                {t("Esta ação irá remover permanentemente o roteiro selecionado e todos os dados associados.", "Esta ação irá remover permanentemente o roteiro selecionado e todos os dados associados.")}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-3 sm:justify-center flex-col sm:flex-row">
            <AlertDialogCancel className="rounded-full h-14 px-8 font-black uppercase tracking-widest text-[11px] border-border/20 flex-1">
              {t("Cancel", "Cancelar")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteRoute(); }}
              className="rounded-full h-14 px-8 bg-destructive text-white hover:bg-destructive/90 font-black uppercase tracking-widest text-[11px] border-none flex-1"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {t("Apagar", "Apagar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!confirmingDeliveryId} onOpenChange={(open) => !open && setConfirmingDeliveryId(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[40px] border-none glass shadow-2xl">
          <Suspense fallback={<div className="p-20 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            {confirmingDeliveryId && (
              <ProofOfDeliveryForm
                deliveryId={confirmingDeliveryId}
                onCancel={() => setConfirmingDeliveryId(null)}
                onComplete={() => {
                  updateDeliveryStatus(confirmingDeliveryId, "delivered");
                  setConfirmingDeliveryId(null);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      <Dialog open={isScanningSearch} onOpenChange={setIsScanningSearch}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[40px] border-none glass shadow-2xl">
          <DialogHeader className="p-10 pb-0">
            <DialogTitle className="text-3xl font-black tracking-tighter text-center">{t("Escanear", "Escanear")}</DialogTitle>
            <DialogDescription className="text-center font-medium opacity-60">Posicione o código no centro</DialogDescription>
          </DialogHeader>
          <div className="p-10 flex flex-col items-center gap-8">
            <div id="map-barcode-reader" className="w-full aspect-square rounded-[32px] overflow-hidden border-2 border-primary/20 bg-muted/30 relative shadow-inner">
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20 pointer-events-none">
                <ScanLine className="w-32 h-32 animate-pulse" />
              </div>
            </div>
            <Button variant="outline" className="w-full h-14 rounded-full font-black uppercase tracking-widest text-[11px]" onClick={() => setIsScanningSearch(false)}>
              {t("Fechar Câmera", "Fechar Câmera")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeliveryListDrawer
        isOpen={isListDrawerOpen}
        onOpenChange={setIsListDrawerOpen}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onScan={() => { setIsListDrawerOpen(false); setIsScanningSearch(true); }}
        filteredDeliveries={filteredDeliveries}
        onSelectStop={(id) => { setSelectedStopId(id); setIsListDrawerOpen(false); }}
        onMarkAllDelivered={markAllAsDelivered}
      />
    </div>
  );
}

export default MapPage;

interface ScopeSectionProps {
  scopeIndex: number;
  scopeTitle?: string;
  scopeDeliveries: any[];
  selectedStopId: string | null;
  mapFilter: string;
  activeScopeStops: string[];
  setMapFilter: (f: any) => void;
  setActiveScopeStops: (s: any) => void;
  setSelectedStopId: (id: any) => void;
  onRecenter: () => void;
  updateDeliveryStatus: (id: string, status: any) => void;
  t: any;
}

const ScopeSection = memo(({ 
  scopeIndex,
  scopeTitle,
  scopeDeliveries,
  selectedStopId, 
  mapFilter, 
  activeScopeStops, 
  setMapFilter, 
  setActiveScopeStops, 
  setSelectedStopId, 
  onRecenter, 
  updateDeliveryStatus, 
  t 
}: ScopeSectionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const isCurrentScope = useMemo(() => 
    selectedStopId && scopeDeliveries.some(d => d.id === selectedStopId),
    [selectedStopId, scopeDeliveries]
  );

  useEffect(() => {
    if (isCurrentScope) {
      setIsExpanded(true);
    }
  }, [isCurrentScope]);

  const isSelectedScopeOnMap = useMemo(() => 
    mapFilter === 'scope' && 
    activeScopeStops.length === scopeDeliveries.length && 
    activeScopeStops.every(id => scopeDeliveries.some(d => d.id === id)),
    [mapFilter, activeScopeStops, scopeDeliveries]
  );

  const handleWazeNavigation = useCallback(async () => {
    // MapTiler API key (fallback from MapView)
    const maptilerKey = (import.meta as any).env?.VITE_MAPTILER_API_KEY || "Ok823KpV0slQnqrfSW5M";

    // Collect all stops, preferring coordinates but keeping addresses as fallback
    const stopsData = await Promise.all(scopeDeliveries.map(async (d) => {
      const hasCoords = d.latitude && d.longitude && !isNaN(Number(d.latitude)) && !isNaN(Number(d.longitude));
      if (hasCoords) {
        return { lat: Number(d.latitude), lng: Number(d.longitude), address: d.destination_address };
      }
      
      // Try geocoding fallback using MapTiler if address exists
      if (d.destination_address) {
        try {
          const response = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(d.destination_address)}.json?key=${maptilerKey}&limit=1`);
          const data = await response.json();
          if (data && data.features?.[0]?.geometry?.coordinates) {
            const [lng, lat] = data.features[0].geometry.coordinates;
            return { lat: Number(lat), lng: Number(lng), address: d.destination_address };
          }
        } catch (e) {
          console.warn("Geocoding failed for:", d.destination_address, e);
        }
      }
      return { lat: null, lng: null, address: d.destination_address };
    }));

    const validPoints = stopsData.filter(s => s.lat !== null || s.address);

    if (validPoints.length === 0) {
      toast.error(t("Nenhuma parada válida neste escopo.", "Nenhuma parada válida neste escopo."));
      return;
    }

    // Waze multi-stop format: https://www.waze.com/ul?ll=lat,lng&ll=lat2,lng2&navigate=yes
    // If coordinates are missing, we use the 'q' parameter for the search, 
    // but Waze only supports one 'q' or multiple 'll' parameters.
    // For consistency with the "10 stops" requirement, we'll try to use 'll' for everything that has it.
    
    let wazeUrl = "https://www.waze.com/ul?";
    const params: string[] = [];

    validPoints.forEach((p) => {
      if (p.lat && p.lng) {
        params.push(`ll=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`);
      } else if (p.address) {
        // Fallback for address search if no coordinates
        params.push(`q=${encodeURIComponent(p.address)}`);
      }
    });

    wazeUrl += params.join('&') + "&navigate=yes";

    window.open(wazeUrl, '_blank');
    
    if (scopeDeliveries.length > 1) {
      toast.success(t("Abrindo roteiro de 10 paradas no Waze.", "Abrindo roteiro de 10 paradas no Waze."));
    } else {
      toast.info(t("Abrindo Waze...", "Abrindo Waze..."));
    }
  }, [scopeDeliveries, t]);

  const handleGoogleMapsRoute = useCallback(async () => {
    const maptilerKey = (import.meta as any).env?.VITE_MAPTILER_API_KEY || "Ok823KpV0slQnqrfSW5M";

    const stopsData = await Promise.all(scopeDeliveries.map(async (d) => {
      const hasCoords = d.latitude && d.longitude && !isNaN(Number(d.latitude)) && !isNaN(Number(d.longitude));
      if (hasCoords) {
        return `${Number(d.latitude)},${Number(d.longitude)}`;
      }
      
      // Try geocoding fallback using MapTiler
      if (d.destination_address) {
        try {
          const response = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(d.destination_address)}.json?key=${maptilerKey}&limit=1`);
          const data = await response.json();
          if (data && data.features?.[0]?.geometry?.coordinates) {
            const [lng, lat] = data.features[0].geometry.coordinates;
            return `${lat},${lng}`;
          }
        } catch (e) {}
        
        // Final fallback: Use the address string itself
        return encodeURIComponent(d.destination_address);
      }
      return null;
    }));

    const validPoints = stopsData.filter(p => p !== null) as string[];

    if (validPoints.length === 0) {
      toast.error(t("Nenhuma parada válida encontrada.", "Nenhuma parada válida encontrada."));
      return;
    }

    // Google Maps supports multiple stops (waypoints)
    // We set destination as the last point and everything else as waypoints
    const destination = validPoints[validPoints.length - 1];
    const waypoints = validPoints.slice(0, -1).join('|');
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    window.open(url, '_blank');
    toast.success(t(`Abrindo roteiro completo (${scopeDeliveries.length} paradas) no Google Maps.`, `Abrindo roteiro completo (${scopeDeliveries.length} paradas) no Google Maps.`));
  }, [scopeDeliveries, t]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "space-y-4 p-4 rounded-[32px] border transition-all duration-300 min-h-[100px]",
        isCurrentScope 
          ? "bg-primary/10 border-primary/20 shadow-lg scale-[1.02]" 
          : "bg-muted/10 border-border/5"
      )}
    >
      {!isVisible ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/20" />
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4">
            <div 
              className="flex items-center gap-3 cursor-pointer group shrink-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center font-black text-sm transition-colors shrink-0",
                isCurrentScope ? "bg-primary text-white" : "bg-primary/10 text-primary"
              )}>
                {scopeIndex + 1}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                  {t("Entregas", "Entregas")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tracking-tight">
                    {scopeTitle || `${scopeIndex * 10 + 1}-${scopeIndex * 10 + scopeDeliveries.length}`}
                  </span>
                  <div className={cn(
                    "transition-transform duration-300",
                    isExpanded ? "rotate-180" : "rotate-0"
                  )}>
                    <X className="h-3 w-3 text-muted-foreground/30 rotate-45" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "rounded-full h-10 px-2 sm:px-4 font-black text-[9px] xs:text-[10px] uppercase tracking-widest border-border/10 transition-all flex-1 sm:flex-none",
                  isSelectedScopeOnMap
                    ? "bg-primary text-white" 
                    : "bg-background/50 hover:bg-primary hover:text-white"
                )}
                onClick={() => {
                  const stopIds = scopeDeliveries.map(d => d.id);
                  if (isSelectedScopeOnMap) {
                    setMapFilter('all');
                    setActiveScopeStops([]);
                  } else {
                    setMapFilter('scope');
                    setActiveScopeStops(stopIds);
                    setSelectedStopId(stopIds[0]);
                    onRecenter();
                  }
                }}
              >
                <MapPin className="h-3.5 w-3.5 mr-1.5 xs:mr-2 shrink-0" />
                <span className="truncate">{isSelectedScopeOnMap ? t("Tudo", "Tudo") : t("Mapa", "Mapa")}</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full h-10 px-2 sm:px-4 font-black text-[9px] xs:text-[10px] uppercase tracking-widest border-border/10 bg-blue-500/10 text-blue-700 hover:bg-blue-500 hover:text-white transition-all flex-1 sm:flex-none"
                onClick={handleGoogleMapsRoute}
                title={t("Roteiro completo (10 paradas)", "Roteiro completo (10 paradas)")}
              >
                <MapPin className="h-3.5 w-3.5 mr-1.5 xs:mr-2 shrink-0" />
                <span className="truncate">Google</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full h-10 px-2 sm:px-4 font-black text-[9px] xs:text-[10px] uppercase tracking-widest border-border/10 bg-[#00E676]/10 text-[#004D40] hover:bg-[#00E676] hover:text-white transition-all flex-1 sm:flex-none"
                onClick={handleWazeNavigation}
              >
                <WazeIcon className="h-3.5 w-3.5 mr-1.5 xs:mr-2 shrink-0" />
                <span className="truncate">Waze</span>
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {scopeDeliveries.map((delivery, deliveryIndex) => (
                    <DeliveryItem
                      key={delivery.id}
                      delivery={delivery}
                      index={deliveryIndex}
                      isSelected={selectedStopId === delivery.id}
                      onSelect={(id) => {
                        setSelectedStopId(id);
                        onRecenter();
                      }}
                      onStatusUpdate={updateDeliveryStatus}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
});

ScopeSection.displayName = "ScopeSection";
