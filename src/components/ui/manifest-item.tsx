import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Badge } from "./badge";
import { Package, MapPin, ChevronRight, Activity } from "lucide-react";
import { statusColor, getStatusLabel } from "@/lib/format";
import { GroupedDelivery } from "@/hooks/useDeliveryGrouping";

interface ManifestItemProps {
  delivery: GroupedDelivery;
  index: number;
  onSelect?: (id: string) => void;
}

export function ManifestItem({ delivery, index, onSelect }: ManifestItemProps) {
  const { t } = useTranslation();
  const d = delivery;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ delay: 0.6 + (index * 0.03) }}
      className={cn(
        "p-4 md:p-8 transition-all duration-500 group relative overflow-hidden",
        d.isGroup ? "bg-violet-500/5 hover:bg-violet-500/10" : "hover:bg-primary/5"
      )}
      onClick={() => onSelect?.(d.id)}
    >
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-[3px] md:w-[4px] scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500",
        d.isGroup ? "bg-violet-500" : "bg-primary"
      )} />
      
      <div className="flex items-center justify-between gap-4 md:gap-10">
        <div className="flex-1 min-w-0 flex items-start gap-3 md:gap-6">
           <div className={cn(
             "h-12 w-12 md:h-16 md:w-16 shrink-0 rounded-xl md:rounded-2xl bg-muted/30 flex flex-col items-center justify-center transition-all duration-500 shadow-inner group-hover:scale-105",
             d.isGroup ? "group-hover:bg-violet-500/10" : "group-hover:bg-primary/10"
           )}>
              <span className="text-[8px] md:text-[10px] font-black text-muted-foreground/40 group-hover:text-primary/40 uppercase mb-0 md:mb-0.5 tracking-widest">SEQ</span>
              <span className="text-lg md:text-2xl font-black text-foreground group-hover:text-primary transition-colors tracking-tighter leading-none">
                 {d.sequence ?? index + 1}
              </span>
           </div>

           <div className="min-w-0 space-y-1 md:space-y-2 pt-0.5 md:pt-1">
              <div className="flex flex-wrap items-center gap-1.5 md:gap-3">
                <span className={cn(
                   "text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] px-2 md:px-3 py-0.5 rounded-full border flex items-center gap-1 md:gap-1.5",
                   d.isGroup 
                     ? "text-violet-600 bg-violet-500/10 border-violet-500/20" 
                     : "text-primary bg-primary/5 border-primary/10"
                 )}>
                   {d.isGroup ? (
                     <>
                       <Package className="h-2.5 md:h-3 md:w-3 w-2.5" /> {d.totalItems} {t("VOLS", "VOLS")}
                     </>
                   ) : (
                     <span className="truncate max-w-[80px] md:max-w-none">{d.groupedItems[0]?.spx_tn || t("SEM RASTREIO", "SEM RASTREIO")}</span>
                   )}
                </span>
                <Badge className={cn(
                  "text-[8px] md:text-[9px] font-black uppercase px-2 md:px-3 py-0.5 md:py-1 rounded-full border-none shadow-sm md:shadow-md transition-all group-hover:scale-105", 
                  statusColor[d.status]
                )}>
                   {getStatusLabel(d.status, t)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 md:gap-3 group/address">
                 <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground group-hover/address:text-primary transition-colors shrink-0" />
                 <h4 className="text-sm md:text-lg font-black text-foreground group-hover:text-primary transition-all truncate tracking-tight">
                    {d.destination_address}
                 </h4>
              </div>
              
              <div className="flex items-center gap-3 opacity-40 group-hover:opacity-60 transition-opacity">
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                   <ChevronRight className="h-2.5 w-2.5" /> {d.neighborhood || t("Bairro não informado", "Bairro não informado")}
                </p>
                {d.isGroup && (
                  <>
                    <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    <p className="text-[9px] md:text-[10px] font-black text-violet-600 uppercase tracking-widest flex items-center gap-1">
                      {d.itemsDelivered}/{d.totalItems} {t("OK", "OK")}
                    </p>
                  </>
                )}
              </div>
           </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
           <div className="h-10 w-10 md:h-12 md:w-12 rounded-full border border-border/10 flex items-center justify-center text-muted-foreground/30 group-hover:text-primary group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-500 group-hover:scale-110">
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
           </div>
        </div>
      </div>
    </motion.div>
  );
}
