import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";


import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation, CheckCircle2, AlertCircle, ScanLine, X, Search, Wrench } from "lucide-react";
import { getStatusLabel, statusColor } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useDateFilter } from "@/contexts/DateFilterContext";
import { useState, useEffect, useRef, useDeferredValue } from "react";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ProofOfDeliveryForm } from "@/components/execution/ProofOfDeliveryForm";


export const Route = createFileRoute("/driver")({ component: () => <AppShell><Driver /></AppShell> });

function Driver() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { formattedRange } = useDateFilter();
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [isScanningSearch, setIsScanningSearch] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (isScanningSearch) {
      import("html5-qrcode").then(({ Html5Qrcode }) => {
        const elementId = "driver-search-barcode-reader";
        
        // Small delay to ensure element is in DOM
        setTimeout(async () => {
          if (!document.getElementById(elementId)) return;
          
          try {
            // Stop existing
            if (scannerRef.current) {
              try {
                await scannerRef.current.stop();
              } catch (e) {
                console.log("Error stopping previous scanner", e);
              }
            }

            const html5QrCode = new Html5Qrcode(elementId);
            scannerRef.current = html5QrCode;
            
            await html5QrCode.start(
              { facingMode: "environment" },
              { 
                fps: 15, 
                qrbox: (viewWidth: number, viewHeight: number) => {
                  const size = Math.min(viewWidth, viewHeight);
                  const qrBoxSize = Math.floor(size * 0.7);
                  return { width: qrBoxSize, height: qrBoxSize };
                },
                aspectRatio: 1.0
              },
              (decodedText) => {
                setSearchTerm(decodedText);
                setIsScanningSearch(false);
                html5QrCode.stop().catch(console.error);
                toast.success(`Buscando código: ${decodedText}`);
              },
              () => {}
            );
          } catch (err) {
            console.error("Unable to start scanning", err);
            toast.error("Erro ao iniciar câmera. Verifique as permissões.");
            setIsScanningSearch(false);
          }
        }, 150);
      });
    }

    return () => {
      if (scannerRef.current && typeof scannerRef.current.stop === 'function') {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(console.error);
        }
      }
    };
  }, [isScanningSearch]);


  const { data: deliveries } = useQuery({
    queryKey: ["driver-deliveries", formattedRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      let query = supabase
        .from("deliveries")
        .select("*, routes!inner(driver_id, name, route_date)")
        .eq("routes.driver_id", user.id)
        .neq("status", "delivered")
        .order("sequence", { ascending: true, nullsFirst: false });

      if (formattedRange) {
        query = query
          .gte("routes.route_date", formattedRange.from)
          .lte("routes.route_date", formattedRange.to);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  const filteredDeliveries = (deliveries ?? []).filter(d => {
    const term = deferredSearchTerm.toLowerCase();
    return (
      d.destination_address?.toLowerCase().includes(term) ||
      d.spx_tn?.toLowerCase().includes(term) ||
      d.neighborhood?.toLowerCase().includes(term)
    );
  });


  const updateStatus = async (id: string, status: "delivered" | "problem") => {
    const { error } = await supabase.from("deliveries").update({
      status, delivered_at: status === "delivered" ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "delivered" ? "Entregue!" : "Marcado com problema");
    qc.invalidateQueries({ queryKey: ["driver-deliveries"] });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t("Minhas entregas", "Minhas entregas")}</h1>
          <p className="text-sm text-muted-foreground">{t("Rotas atribuídas a você", "Rotas atribuídas a você")}</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={() => navigate({ to: "/admin/maintenance" })}>
             <Wrench className="h-4 w-4" />
           </Button>
           <Badge variant="outline" className="font-bold h-10 px-4 rounded-xl flex items-center">{filteredDeliveries.length}</Badge>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("Buscar rastreio ou endereço...", "Buscar rastreio ou endereço...")}
              className="w-full pl-10 pr-10 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "rounded-xl shrink-0 h-10 w-10",
              isScanningSearch && "bg-primary text-primary-foreground border-primary"
            )}
            onClick={() => setIsScanningSearch(!isScanningSearch)}
          >
            <ScanLine className="h-5 w-5" />
          </Button>
        </div>

        {isScanningSearch && (
          <div className="relative animate-in fade-in slide-in-from-top-2">
            <div id="driver-search-barcode-reader" className="w-full h-48 rounded-xl overflow-hidden border-2 border-primary bg-black flex items-center justify-center relative">
              <div className="text-white/50 text-[10px] font-bold animate-pulse">{t("Iniciando câmera...", "Iniciando câmera...")}</div>
            </div>
            <Button 
              size="icon" 
              variant="destructive" 
              className="absolute top-2 right-2 rounded-full h-8 w-8 z-50 shadow-lg border-2 border-white/20"
              onClick={() => {
                if (scannerRef.current) {
                  scannerRef.current.clear().catch(console.error);
                }
                setIsScanningSearch(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {!filteredDeliveries?.length ? (

        <Card className="p-12 text-center text-sm text-muted-foreground">
          {t("Nenhuma entrega atribuída a você no momento.", "Nenhuma entrega atribuída a você no momento.")}
        </Card>
      ) : (
        filteredDeliveries.map((d, i) => (
          <Card key={d.id} className={`p-4 ${i === 0 ? "border-primary" : ""}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="font-mono text-xs text-primary">#{d.sequence ?? i + 1} · {d.spx_tn ?? "—"}</div>
                <div className="font-medium mt-1">{d.destination_address}</div>
                <div className="text-xs text-muted-foreground">{d.neighborhood} · {d.city} · {d.zipcode}</div>
              </div>
              <Badge className={statusColor[d.status] ?? ""}>{getStatusLabel(d.status, t)}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {d.latitude != null && d.longitude != null && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${d.latitude},${d.longitude}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-info text-info-foreground text-sm font-medium"
                >
                  <Navigation className="h-4 w-4" /> {t("Navegar", "Navegar")}
                </a>
              )}
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => setConfirmingDeliveryId(d.id)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> {t("Entregue", "Entregue")}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => updateStatus(d.id, "problem")}>
                <AlertCircle className="h-4 w-4 mr-1" /> {t("Problema", "Problema")}
              </Button>
            </div>
          </Card>
        ))
      )}

      {/* Proof of Delivery Drawer */}
      <Drawer 
        open={!!confirmingDeliveryId} 
        onOpenChange={(o) => !o && setConfirmingDeliveryId(null)}
      >
        <DrawerContent className="max-h-[95vh] rounded-t-[2rem]">
          {confirmingDeliveryId && (
            <ProofOfDeliveryForm 
              deliveryId={confirmingDeliveryId}
              expectedSpxTn={deliveries?.find(d => d.id === confirmingDeliveryId)?.spx_tn || undefined}
              onComplete={() => {
                setConfirmingDeliveryId(null);
                qc.invalidateQueries({ queryKey: ["driver-deliveries"] });
              }}
              onCancel={() => setConfirmingDeliveryId(null)}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

