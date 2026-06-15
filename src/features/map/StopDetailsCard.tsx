import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

import { Navigation as NavigationIcon, CheckCircle2, AlertTriangle, X, MapPin, Hash, Package, ExternalLink, TestTube2 } from "lucide-react";
import { getStatusLabel, statusColor } from "@/lib/format";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { StreetViewImage } from "@/components/StreetViewImage";
import { expandAddressAbbreviations } from "@/lib/address-normalization";
import { openNavigationApp } from "@/lib/native-utils";

interface CustomerNoteLite {
  id: string;
  category: string;
  note: string | null;
}

interface StopDetailsCardProps {
  stop: any;
  customerNotes?: CustomerNoteLite[];
  onClose: () => void;
  onStatusUpdate: (id: string, status: 'delivered' | 'problem') => void;
  onConfirmDelivery: (id: string) => void;
  pendingStops?: any[];
}

export function StopDetailsCard({ stop, customerNotes = [], onClose, onStatusUpdate, onConfirmDelivery, pendingStops = [] }: StopDetailsCardProps) {
  const { t } = useTranslation();
  if (!stop) return null;


  const items = stop.groupedItems || [stop];
  const allDelivered = items.every((i: any) => i.status === 'delivered');

  return (
    <motion.div 
      initial={{ opacity: 0, y: "100%", scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: "100%", scale: 0.95 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed bottom-4 left-4 right-4 z-[5000] lg:absolute lg:bottom-4 lg:left-4 lg:right-auto lg:w-72 flex flex-col"
    >
      <Card className="rounded-[24px] border-none shadow-2xl overflow-hidden bg-background/95 backdrop-blur-xl ring-1 ring-border/10 flex flex-col max-h-[40vh] lg:max-h-[60vh]">
        <div className="mx-auto w-10 h-1 rounded-full bg-muted/40 mt-2 mb-1 lg:hidden" />
        <CardContent className="p-0 flex flex-col overflow-hidden">
          {/* Street View Area */}
          <div className="relative h-20 md:h-24 bg-muted overflow-hidden group shrink-0">
            <StreetViewImage 
              latitude={Number(stop.latitude)} 
              longitude={Number(stop.longitude)} 
              className="w-full h-full" 
            />
            
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
               <Badge className={cn(
                 "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none shadow-lg", 
                 statusColor[stop.status]
               )}>
                  {stop.isGroup ? `${stop.itemsDelivered}/${stop.totalItems} ${t("Entregues", "Entregues")}` : getStatusLabel(stop.status, t)}
               </Badge>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-all"
            >
               <X className="h-4 w-4" />
            </Button>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>

          {/* Ressalvas anteriores neste endereço — abaixo da fachada */}
          {customerNotes.length > 0 && (
            <div className="mx-3 md:mx-5 mt-3 rounded-2xl border border-red-700/40 bg-red-900/10 p-3 space-y-1.5">
              <div className="text-[10px] font-black uppercase tracking-widest text-red-700 dark:text-red-400">
                ⚠️ {t("Ressalvas anteriores neste endereço", "Ressalvas anteriores neste endereço")} ({customerNotes.length})
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {customerNotes.map((n) => (
                  <div key={n.id} className="text-xs">
                    <span className="font-bold">• {n.category}</span>
                    {n.note && <span className="text-muted-foreground"> — {n.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          
          <div className="p-3 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-2 mb-2">
               <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md shrink-0">
                 <span className="text-[9px] font-black">{stop.sequence}</span>
               </div>
               <div className="flex flex-col min-w-0">
                  <div className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 truncate">
                     {stop.isGroup ? <Package className="h-2 w-2" /> : <Hash className="h-2 w-2" />}
                     {stop.isGroup ? `${stop.totalItems} ${t("Volumes", "Volumes")}` : (stop.spx_tn || t("SEM RASTREIO", "SEM RASTREIO"))}
                  </div>
               </div>
            </div>

            <h3 className="text-xs md:text-sm font-black tracking-tight mb-0.5 leading-tight text-foreground line-clamp-2">
               {expandAddressAbbreviations(stop.destination_address)}
            </h3>
            <div className="flex items-center gap-1 text-muted-foreground font-bold text-[8px] md:text-[9px] mb-3">
               <MapPin className="h-2.5 w-2.5" /> {stop.neighborhood} {stop.city && `• ${stop.city}`}
            </div>

            {/* List of deliveries for this address */}
            <div className="space-y-1.5 mb-3">
              {items.map((item: any) => (
                <div key={item.id} className="p-2 rounded-2xl bg-muted/30 border border-border/5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[9px] font-black tracking-widest uppercase text-muted-foreground/60">
                      {item.spx_tn || t("SEM CÓDIGO", "SEM CÓDIGO")}
                    </div>
                    <div className={cn("text-[8px] font-bold uppercase", item.status === 'delivered' ? "text-emerald-500" : "text-muted-foreground")}>
                      {getStatusLabel(item.status, t)}
                    </div>
                  </div>
                  
                  {item.status !== 'delivered' && (
                    <div className="flex gap-1 shrink-0">
                      <Button 
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 rounded-full p-0 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                        onClick={() => onConfirmDelivery(item.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 rounded-full p-0 border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white"
                        onClick={() => onStatusUpdate(item.id, 'problem')}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-1 grid grid-cols-2 gap-2">
              <Button 
                variant="outline"
                className="h-10 md:h-10 rounded-full group w-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                onClick={() => openNavigationApp(stop.latitude, stop.longitude, stop.destination_address)}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> 
                <span className="text-[9px] font-black uppercase tracking-widest">{t("Esta", "Esta")}</span>
              </Button>

              {(() => {
                const list = (pendingStops && pendingStops.length > 0 ? pendingStops : [stop])
                  .filter((s: any) => s && s.latitude != null && s.longitude != null)
                  .slice(0, 10);
                const destination = list[list.length - 1];
                const waypoints = list.slice(0, -1);
                const wpParam = waypoints.length
                  ? `&waypoints=${encodeURIComponent(waypoints.map((s: any) => `${s.latitude},${s.longitude}`).join('|'))}`
                  : '';
                const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}${wpParam}&travelmode=driving&dir_action=navigate`;
                return (
                  <Button
                    asChild
                    variant="premium"
                    className="h-10 md:h-10 rounded-full group w-full shadow-lg shadow-primary/10"
                  >
                    <a href={url} target="_blank" rel="noreferrer">
                      <NavigationIcon className="h-3.5 w-3.5 mr-1.5 fill-current group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        GPS ({list.length > 1 ? ` · ${list.length}` : '1'})
                      </span>
                    </a>
                  </Button>
                );
              })()}
            </div>

            {/* Botão de teste com 9 waypoints fictícios */}
            {(() => {
              const baseLat = Number(stop.latitude) || -23.5505;
              const baseLng = Number(stop.longitude) || -46.6333;
              const offsets = [
                [0.00, 0.00],
                [0.01, 0.00],
                [0.00, 0.01],
                [-0.01, 0.00],
                [0.00, -0.01],
                [0.01, 0.01],
                [-0.01, -0.01],
                [0.01, -0.01],
                [-0.01, 0.01],
                [0.005, 0.005],
              ];
              const testList = offsets.map(([dLat, dLng], i) => ({
                latitude: baseLat + dLat,
                longitude: baseLng + dLng,
                id: `test-${i}`,
              }));
              const testDest = testList[testList.length - 1];
              const testWaypoints = testList.slice(0, -1);
              const testWpParam = `&waypoints=${encodeURIComponent(testWaypoints.map((s: any) => `${s.latitude},${s.longitude}`).join('|'))}`;
              const testUrl = `https://www.google.com/maps/dir/?api=1&destination=${testDest.latitude},${testDest.longitude}${testWpParam}&travelmode=driving&dir_action=navigate`;
              return (
                <Button
                  asChild
                  variant="outline"
                  className="mt-2 h-8 rounded-full group w-full border-amber-500/20 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10"
                >
                  <a href={testUrl} target="_blank" rel="noreferrer">
                    <TestTube2 className="h-4 w-4 mr-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {t("Testar GPS (9 waypoints)", "Testar GPS (9 waypoints)")}
                    </span>
                  </a>
                </Button>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
