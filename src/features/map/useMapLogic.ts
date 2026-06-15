import { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "@/contexts/LocationContext";
import { useAvailableRoutes, useRouteDeliveries } from "@/hooks/queries/useRouteQueries";
import { deliveryService, routeService } from "@/services/api";
import { nearestNeighborOrder } from "@/lib/geo";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { triggerRecenter, getNavSettings, onNavSettingsChange } from "@/lib/nav-settings";
import { syncService } from "@/services/sync-service";
import { Network } from "@capacitor/network";
import { expandAddressAbbreviations } from "@/lib/address-normalization";
import { canonicalizeAddress } from "@/lib/address-utils";
import { useDeliveryGrouping } from "@/hooks/useDeliveryGrouping";


export function useMapLogic(routeId: string | undefined, formattedRange: any) {
  const qc = useQueryClient();
  const { location: userLocation } = useLocation();
  
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [detailStopId, setDetailStopId] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isScanningSearch, setIsScanningSearch] = useState(false);
  const [isListDrawerOpen, setIsListDrawerOpen] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizationStage, setOptimizationStage] = useState("");
  const [viewMode, setViewMode] = useState<'original' | 'optimized'>('original');
  const [showDelivered, setShowDelivered] = useState(true);
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<string>('all');
  const [activeScopeStops, setActiveScopeStops] = useState<string[]>([]);
  const [compactMode, setCompactMode] = useState(false);
  const [navSettings, setNavSettingsState] = useState(() => getNavSettings());

  useEffect(() => {
    return onNavSettingsChange(setNavSettingsState);
  }, []);

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const scannerRef = useRef<any>(null);
  const deliveriesRef = useRef<any[]>([]);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (!isScanningSearch) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const stopCurrentScanner = async () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (!scanner) return;
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch {
        // The scanner may already be stopped by the library.
      }
      try {
        await scanner.clear?.();
      } catch {
        // Clear is best-effort and can fail when the element has been removed.
      }
    };

    import("html5-qrcode")
      .then(({ Html5Qrcode }) => {
        if (cancelled) return;
        timer = setTimeout(async () => {
          const candidates = [
            "map-barcode-reader",
            "search-barcode-reader-mobile",
            "search-barcode-reader",
          ];
          const elementId = candidates.find((id) => document.getElementById(id));

          if (cancelled) return;
          if (!elementId) {
            toast.error("Não foi possível abrir o leitor.");
            setIsScanningSearch(false);
            return;
          }

          try {
            await stopCurrentScanner();
            if (cancelled) return;

            const html5QrCode = new Html5Qrcode(elementId);
            scannerRef.current = html5QrCode;

            const config = {
              fps: 15,
              qrbox: (viewWidth: number, viewHeight: number) => {
                const size = Math.min(viewWidth, viewHeight);
                const qrBoxSize = Math.floor(size * 0.7);
                return { width: qrBoxSize, height: qrBoxSize };
              },
              aspectRatio: 1.0,
            };

            await html5QrCode.start(
              { facingMode: "environment" },
              config,
              (decodedText) => {
                if (cancelled) return;
                const cleanedText = decodedText.trim();
                
                const delivery = deliveriesRef.current?.find(
                  (d: any) => d.spx_tn === cleanedText || (d.spx_tn && d.spx_tn.includes(cleanedText)),
                );
                
                if (delivery) {
                  toast.success(`Encontrado: ${delivery.destination_address}`, {
                    duration: 1500,
                  });
                  setSearchTerm(cleanedText);
                  setSelectedStopId(delivery.id);
                } else {
                  toast.info(`Lido: ${decodedText} (não na lista)`, { duration: 1000 });
                }
              },
              () => {},
            );
          } catch {
            if (!cancelled) {
              toast.error("Erro ao iniciar câmera. Verifique as permissões.");
              setIsScanningSearch(false);
            }
          }
        }, 100);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Não foi possível carregar o leitor.");
          setIsScanningSearch(false);
        }
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stopCurrentScanner();
    };
  }, [isScanningSearch]);

  const onRecenter = () => {
    triggerRecenter();
    toast.info("Centralizando mapa...");
  };

  const { data: availableRoutes } = useAvailableRoutes(formattedRange);
  const { data: deliveries, isLoading } = useRouteDeliveries(routeId);

  useEffect(() => {
    deliveriesRef.current = deliveries || [];
  }, [deliveries]);

  const releaseWakeLock = useCallback(async () => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (!lock) return;
    try {
      await lock.release();
    } catch {
      // Wake lock may already be released by the browser.
    }
  }, []);

  const startNavigation = async () => {
    setNavigating(true);
    toast.success("Navegação ativada");

    try {
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch {
      wakeLockRef.current = null;
    }
  };

  const stopNavigation = async () => {
    setNavigating(false);
    toast.success("Navegação desativada");
    await releaseWakeLock();
  };

  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !navigating || wakeLockRef.current) return;
      if ("wakeLock" in navigator) {
        (navigator as any).wakeLock.request("screen").then((lock: any) => {
          wakeLockRef.current = lock;
        }).catch(() => undefined);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [navigating]);

  const optimizeRoute = async () => {
    let currentLoc = userLocation;
    
    if (!deliveries || optimizing || !routeId) return;
    setOptimizing(true);
    setOptimizationProgress(0);
    setOptimizationStage("Obtendo localização atual...");

    try {
      if ("geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              enableHighAccuracy: true, 
              timeout: 10000, 
              maximumAge: 0 
            });
          });
          currentLoc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          };
        } catch (e) {
          console.warn("Could not get fresh location for optimization, using last known", e);
        }
      }

      setOptimizationStage("Calculando melhor rota...");
      
      const missingOriginal = deliveries.some((d: any) => d.original_sequence === null);
      if (missingOriginal) {
        setOptimizationStage("Preservando ordem original...");
        const allIds = deliveries.map((d: any) => d.id);
        const allSeqs = deliveries.map((d: any) => d.sequence || 0);
        
        await supabase.rpc("update_deliveries_original_sequence", {
          delivery_ids: allIds,
          sequences: allSeqs
        });
      }

      const stopsToOptimize = deliveries
        .filter((d: any) => d.status !== 'delivered' && d.status !== 'problem')
        .map((d: any) => ({
          id: d.id,
          lat: d.latitude != null ? Number(d.latitude) : null,
          lng: d.longitude != null ? Number(d.longitude) : null,
        }))
        .filter((s: any) => s.lat !== null && s.lng !== null);

      if (stopsToOptimize.length === 0) {
        toast.info("Nenhuma entrega pendente para otimizar");
        return;
      }

      const startPoint =
        currentLoc &&
        Number.isFinite(currentLoc.latitude) &&
        Number.isFinite(currentLoc.longitude)
          ? {
              id: 'user',
              lat: currentLoc.latitude,
              lng: currentLoc.longitude,
            }
          : undefined;

      const optimizedOrderIds = nearestNeighborOrder(stopsToOptimize, startPoint);
      
      const finishedIds = deliveries
        .filter((d: any) => d.status === 'delivered' || d.status === 'problem')
        .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
        .map((d: any) => d.id);

      setOptimizationStage("Atualizando sequências...");
      
      const { error: pendingError } = await supabase.rpc("update_deliveries_sequence", {
        delivery_ids: optimizedOrderIds,
        sequences: optimizedOrderIds.map((_, i) => i + 1)
      });
      
      if (pendingError) throw pendingError;

      if (finishedIds.length > 0) {
        await supabase.rpc("update_deliveries_sequence", {
          delivery_ids: finishedIds,
          sequences: finishedIds.map((_, i) => 1000 + i + 1)
        });
      }
      
      await routeService.updateRoute(routeId, { optimization_mode: "shortest_distance" });
      setViewMode('optimized');
      
      await qc.invalidateQueries({ queryKey: ["all-deliveries-map", routeId] });
      await qc.invalidateQueries({ queryKey: ["route", routeId] });
      toast.success("Rota otimizada! Entregas reordenadas por proximidade.");
    } catch (error) {
      console.error("Optimization error:", error);
      toast.error("Erro ao otimizar rota");
    } finally {
      setOptimizing(false);
      setOptimizationProgress(0);
      setOptimizationStage("");
    }
  };

  const resetOptimization = async () => {
    if (!deliveries || optimizing || !routeId) return;
    setOptimizing(true);
    setOptimizationStage("Restaurando ordem original...");
    
    try {
      const allIds = deliveries.map((d: any) => d.id);
      const allOriginalSeqs = deliveries.map((d: any) => d.original_sequence || d.sequence || 0);
      
      await deliveryService.updateSequences(allIds, allOriginalSeqs);
      await routeService.updateRoute(routeId, { optimization_mode: null });
      
      setViewMode('original');
      await qc.invalidateQueries({ queryKey: ["all-deliveries-map", routeId] });
      await qc.invalidateQueries({ queryKey: ["route", routeId] });
      toast.success("Ordem original restaurada");
    } catch (error) {
      console.error("Error resetting optimization:", error);
      toast.error("Erro ao restaurar ordem original");
    } finally {
      setOptimizing(false);
      setOptimizationStage("");
    }
  };

  const updateDeliveryStatus = useCallback(async (id: string, status: 'delivered' | 'problem') => {
    try {
      const net = await Network.getStatus();
      const deliveredAt = status === 'delivered' ? new Date().toISOString() : null;

      if (!net.connected) {
        await syncService.addToQueue('delivery_update', { id, status, delivered_at: deliveredAt });
        // Update local cache optimistically
        qc.setQueryData(["all-deliveries-map", routeId], (old: any) => {
           if (!old) return old;
           return old.map((d: any) => d.id === id ? { ...d, status, delivered_at: deliveredAt } : d);
        });
      } else {
        await deliveryService.updateDeliveryStatus(id, status as any);
        toast.success("Status atualizado!");
      }

      
      setSelectedStopId(null);
      
      await qc.invalidateQueries({ 
        queryKey: ["all-deliveries-map", routeId],
        exact: false 
      });
      
      if (routeId) {
        await qc.invalidateQueries({ 
          queryKey: ["route", routeId],
          exact: false 
        });
      }

      if (viewMode === 'optimized' && status === 'delivered') {
        optimizeRoute();
      }
      
      if (deliveriesRef.current && deliveriesRef.current.length > 0) {
        const sortedPendings = [...deliveriesRef.current]
          .filter((d: any) => d.id !== id && (d.status === 'pending' || d.status === 'in_route'))
          .sort((a: any, b: any) => {
            const seqA = viewMode === 'original' ? (a.original_sequence || 999) : (a.sequence || 999);
            const seqB = viewMode === 'original' ? (b.original_sequence || 999) : (b.sequence || 999);
            return seqA - seqB;
          });
        
        if (sortedPendings.length > 0) {
          setSelectedStopId(sortedPendings[0].id);
        } else {
          setSelectedStopId(null);
        }
      }
    } catch (error) {
      console.error("Error updating delivery status:", error);
      toast.error("Erro ao atualizar status");
    }
  }, [qc, viewMode, routeId, optimizeRoute]);

  const markAllAsDelivered = useCallback(async () => {
    if (!routeId) return;
    try {
      await deliveryService.markAllAsDelivered(routeId);
      toast.success("Todas as entregas marcadas como concluídas!");
      await qc.invalidateQueries({ queryKey: ["all-deliveries-map", routeId] });
      await qc.invalidateQueries({ queryKey: ["route", routeId] });
    } catch (error) {
      console.error("Error marking all as delivered:", error);
      toast.error("Erro ao atualizar entregas");
    }
  }, [qc, routeId]);

  const groupedDeliveries = useDeliveryGrouping(
    deliveries, 
    viewMode, 
    navSettings.groupByStreet ? 'street' : 'canonical'
  );

  const filteredDeliveries = useMemo(() => {
    const term = deferredSearchTerm.toLowerCase();
    if (!term) return groupedDeliveries;
    
    return groupedDeliveries.filter((g: any) => {
      const normalizedAddr = expandAddressAbbreviations(g.destination_address || "").toLowerCase();
      return (
        g.destination_address?.toLowerCase().includes(term) ||
        normalizedAddr.includes(term) ||
        g.neighborhood?.toLowerCase().includes(term) ||
        g.groupedItems?.some((i: any) => i.spx_tn?.toLowerCase().includes(term))
      );
    });
  }, [groupedDeliveries, deferredSearchTerm]);

  return {
    selectedStopId, setSelectedStopId,
    detailStopId, setDetailStopId,
    optimizing, optimizeRoute, resetOptimization,
    navigating, startNavigation, stopNavigation,
    searchTerm, setSearchTerm,
    isScanningSearch, setIsScanningSearch,
    isListDrawerOpen, setIsListDrawerOpen,
    optimizationProgress, optimizationStage,
    viewMode, setViewMode,
    showDelivered, setShowDelivered,
    confirmingDeliveryId, setConfirmingDeliveryId,
    mapFilter, setMapFilter,
    activeScopeStops, setActiveScopeStops,
    availableRoutes, deliveries, isLoading,
    filteredDeliveries, groupedDeliveries,
    updateDeliveryStatus, onRecenter,
    markAllAsDelivered,
    compactMode, setCompactMode,
  };
}
