import { memo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { MapPin, CheckCircle2, Eye, ExternalLink, Hash, Package, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStatusLabel, statusColor } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import { StreetViewImage } from "./StreetViewImage";
import { expandAddressAbbreviations } from "@/lib/address-normalization";
import { openNavigationApp } from "@/lib/native-utils";

interface DeliveryItemProps {
  delivery: any;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onStatusUpdate?: (id: string, status: 'delivered' | 'problem') => void;
  index: number;
}

export const DeliveryItem = memo(({ delivery, isSelected, onSelect, onStatusUpdate, index }: DeliveryItemProps) => {
  const { t } = useTranslation();

  const [showStreetView, setShowStreetView] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const items = delivery.groupedItems || [delivery];
  const isGroup = delivery.isGroup;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${t("Entrega para", "Entrega para")} ${expandAddressAbbreviations(delivery.destination_address)}`}
      className={cn(
        "p-4 xs:p-5 rounded-xl xs:rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group mb-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        delivery.status === 'delivered' 
          ? "bg-emerald-500/[0.03] border-emerald-500/10 grayscale-[0.3] opacity-80" 
          : isSelected 
            ? "bg-card border-primary shadow-[0_30px_60px_-12px_rgba(255,140,0,0.25)] -translate-y-2 scale-[1.02]" 
            : isGroup
              ? "bg-[#8B5CF6]/5 border-[#8B5CF6]/10 hover:border-[#8B5CF6]/30 hover:shadow-lg hover:-translate-y-1"
              : "bg-background/40 border-border/5 hover:border-primary/40 hover:bg-card hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-1 active:translate-y-0"
      )}
      onClick={() => onSelect(delivery.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(delivery.id);
        }
      }}
    >
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/80 flex items-center gap-2">
            <div className={cn("h-1.5 w-1.5 rounded-full", delivery.status === 'delivered' ? "bg-emerald-500" : isGroup ? "bg-[#8B5CF6]" : "bg-primary")} />
            {isGroup ? (
              <span className="flex items-center gap-1.5">
                <Package className="h-3 w-3" /> {delivery.totalItems} {t("VOLUMES", "VOLUMES")}
              </span>
            ) : (
              delivery.spx_tn || t("SEM RASTREIO", "SEM RASTREIO")
            )}
            {delivery.hasHistoryIssues && (
              <Badge variant="outline" className="ml-auto bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-[8px] font-black gap-1 px-2 py-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> {t("DIFICULDADE", "DIFICULDADE")}
              </Badge>
            )}
          </div>
          <div className="text-sm xs:text-base font-black tracking-tighter line-clamp-1 group-hover:text-primary transition-colors leading-tight">
             {expandAddressAbbreviations(delivery.destination_address)}
          </div>
        </div>
        <Badge className={cn(
          "text-[10px] font-black uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full border-none shadow-sm shrink-0", 
          statusColor[delivery.status]
        )}>
          {isGroup ? `${delivery.itemsDelivered}/${delivery.totalItems}` : getStatusLabel(delivery.status, t)}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-muted/30">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
          <div className="text-xs font-bold text-muted-foreground/60 truncate italic">
            {delivery.neighborhood || delivery.city}
          </div>
        </div>

        {isGroup && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1 active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {isExpanded ? t("Ocultar", "Ocultar") : t("Ver Todos", "Ver Todos")}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {(isExpanded || (isSelected && !isGroup)) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-border/10 space-y-2"
          >
            {items.map((item: any) => (
              <div key={item.id} className="p-3 rounded-xl bg-muted/20 border border-border/5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[9px] font-black tracking-widest text-muted-foreground/60 mb-0.5 truncate uppercase">
                    {item.spx_tn || t("SEM CÓDIGO", "SEM CÓDIGO")}
                  </div>
                  <div className={cn("text-[8px] font-bold uppercase", item.status === 'delivered' ? "text-emerald-500" : "text-muted-foreground")}>
                    {getStatusLabel(item.status, t)}
                  </div>
                </div>
                {item.status !== 'delivered' && onStatusUpdate && (
                  <div className="flex gap-1 shrink-0">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 rounded-lg p-0 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusUpdate(item.id, 'delivered');
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {isSelected && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-6 pt-6 border-t border-border/10 flex flex-col gap-4">
              {showStreetView && (
                <div className="rounded-2xl overflow-hidden border border-border/10 shadow-2xl relative h-32">
                  <StreetViewImage 
                    latitude={Number(delivery.latitude)} 
                    longitude={Number(delivery.longitude)} 
                    className="w-full h-full" 
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-black text-[10px] h-10 uppercase tracking-widest border-border/10 hover:bg-primary hover:text-white transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStreetView(!showStreetView);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showStreetView ? t("Fechar", "Fechar") : t("Fachada", "Fachada")}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-black text-[10px] h-10 uppercase tracking-widest border-border/10 hover:bg-sky-500 hover:text-white transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    openNavigationApp(delivery.latitude, delivery.longitude, delivery.destination_address);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("Abrir GPS", "Abrir GPS")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {delivery.sequence && delivery.sequence < 1000 && (
        <div className="absolute -bottom-5 -right-3 text-[100px] font-black text-foreground/[0.02] group-hover:text-primary/[0.05] transition-all duration-1000 select-none pointer-events-none transform translate-y-3 group-hover:translate-y-0 italic">
           {delivery.sequence}
        </div>
      )}
    </motion.div>
  );
});

DeliveryItem.displayName = "DeliveryItem";
