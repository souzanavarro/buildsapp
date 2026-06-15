import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, Phone, MessageSquare, Clock } from "lucide-react";
import { getStatusLabel, statusColor } from "@/lib/format";
import { useTranslation } from "react-i18next";
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const MapView = lazy(() => import("@/components/MapView").then(m => ({ default: m.MapView })));


export const Route = createFileRoute("/tracking/$token")({
  component: PublicTrackingPage,
});

function PublicTrackingPage() {
  const { token } = Route.useParams();
  const { t } = useTranslation();

  const { data: delivery, isLoading, error } = useQuery({
    queryKey: ["public-tracking", token],
    queryFn: async () => {
      const { data: d, error: dErr } = await supabase
        .from("deliveries")
        .select(`
          id,
          status,
          destination_address,
          neighborhood,
          city,
          spx_tn,
          latitude,
          longitude,
          driver_id
        `)
        .eq("tracking_token", token)
        .maybeSingle();

      if (dErr) throw dErr;
      if (!d) throw new Error("Delivery not found");

      // Fetch driver profile
      const { data: driver } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("user_id", d.driver_id as string)
        .maybeSingle();

      // Fetch driver real-time location (telemetry)
      const { data: telemetry } = await supabase
        .from("driver_telemetry")
        .select("latitude, longitude, speed, heading, created_at")
        .eq("user_id", d.driver_id as string)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();


      return { ...d, driver, lastLocation: telemetry };
    },

    refetchInterval: 30000, // Update every 30s
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center p-8 text-center">{t("Carregando...", "Carregando...")}</div>;
  if (error || !delivery) return <div className="min-h-screen flex items-center justify-center p-8 text-center">{t("Entrega não encontrada ou link expirado.", "Entrega não encontrada ou link expirado.")}</div>;

  const isDelivered = delivery.status === 'delivered';
  const lastUpdate = delivery.lastLocation ? new Date(delivery.lastLocation.created_at) : null;

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex flex-col p-4 xs:p-6 lg:p-10 gap-6">
      <div className="max-w-xl mx-auto w-full space-y-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-primary font-black text-[10px] uppercase tracking-[0.2em]">
            <Truck className="h-4 w-4" /> {t("Rastreio em Tempo Real", "Rastreio em Tempo Real")}
          </div>
          <h1 className="text-2xl xs:text-3xl font-black tracking-tighter">{t("Acompanhe sua Entrega", "Acompanhe sua Entrega")}</h1>
        </header>

        <Card className="rounded-[2rem] border-none shadow-2xl overflow-hidden bg-card/60 backdrop-blur-xl ring-1 ring-border/5">
          <CardContent className="p-0">
            <div className="h-64 relative bg-muted">
              <Suspense fallback={<div className="w-full h-full animate-pulse bg-muted" />}>
                <MapView 
                  stops={[{
                    id: delivery.id,
                    latitude: Number(delivery.latitude) || 0,
                    longitude: Number(delivery.longitude) || 0,
                    status: delivery.status,
                    sequence: 1,
                  }]}
                  userLocation={delivery.lastLocation ? {
                    latitude: delivery.lastLocation.latitude,
                    longitude: delivery.lastLocation.longitude,
                  } : undefined}
                />

              </Suspense>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">{t("Código de Rastreio", "Código de Rastreio")}</div>
                  <div className="text-lg font-black tracking-tight">{delivery.spx_tn || "—"}</div>
                </div>
                <Badge className={cn("px-4 py-1.5 rounded-full font-black uppercase text-[9px] tracking-widest", statusColor[delivery.status])}>
                  {getStatusLabel(delivery.status, t)}
                </Badge>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/5">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                   <div className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">{t("Endereço de Destino", "Endereço de Destino")}</div>
                   <div className="font-bold text-sm truncate">{delivery.destination_address}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-black uppercase">
                    {(delivery.driver?.full_name?.substring(0, 2) || "RC").toUpperCase()}
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">{t("Motorista Responsável", "Motorista Responsável")}</div>
                    <div className="font-bold text-sm">{delivery.driver?.full_name || "Rota Certa"}</div>
                 </div>

                 {delivery.driver?.phone && (
                   <div className="flex gap-2">
                      <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" asChild>
                         <a href={`tel:${delivery.driver.phone}`}><Phone className="h-4 w-4" /></a>
                      </Button>
                      <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl text-emerald-500" asChild>
                         <a href={`https://wa.me/55${delivery.driver.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                           <MessageSquare className="h-4 w-4" />
                         </a>
                      </Button>
                   </div>
                 )}
              </div>
            </div>
          </CardContent>
        </Card>

        {!isDelivered && delivery.lastLocation && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center gap-3"
          >
             <Clock className="h-5 w-5 animate-pulse" />
             <p className="text-[10px] font-bold uppercase tracking-wider">
               {t("Última localização vista às", "Última localização vista às")} {lastUpdate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
