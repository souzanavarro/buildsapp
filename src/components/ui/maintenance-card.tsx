import { useTranslation } from "react-i18next";
import { PremiumCard } from "./premium-card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Truck, History, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MaintenanceCardProps {
  driver: {
    user_id: string;
    full_name: string;
    last_maintenance_odometer: number;
    maintenance_alert_interval_km: number;
    kmSinceLast: number;
    isAlert: boolean;
    progress: number;
  };
  index?: number;
  onRegister?: (id: string) => void;
}

export function MaintenanceCard({ driver: d, index = 0, onRegister }: MaintenanceCardProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <PremiumCard className={cn(
        "group hover:shadow-2xl transition-all duration-500",
        d.isAlert && "ring-2 ring-destructive/20 border-destructive/20"
      )}>
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
               <Truck className="h-7 w-7" />
            </div>
            {d.isAlert ? (
              <Badge className="bg-destructive text-white border-none px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                {t("Manutenção Urgente", "Manutenção Urgente")}
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                {t("Saúde OK", "Saúde OK")}
              </Badge>
            )}
          </div>

          <div className="space-y-1">
             <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">{d.full_name}</h3>
             <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/60">
                <History className="h-3.5 w-3.5" /> {t("Última revisão:", "Última revisão:")} {Number(d.last_maintenance_odometer).toLocaleString()} km
             </div>
          </div>

          <div className="space-y-3">
             <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("Próxima Manutenção", "Próxima Manutenção")}</span>
                <span className="text-sm font-black">{Math.round(d.kmSinceLast)} / {d.maintenance_alert_interval_km} km</span>
             </div>
             <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden p-0.5 border border-border/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${d.progress}%` }}
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    d.progress > 80 ? "bg-destructive" : d.progress > 50 ? "bg-amber-500" : "bg-emerald-500"
                  )} 
                />
             </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 border-border/20 bg-background/50 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
            onClick={() => onRegister?.(d.user_id)}
          >
             <Plus className="h-4 w-4" /> {t("Registrar Manutenção", "Registrar Manutenção")}
          </Button>
        </div>
      </PremiumCard>
    </motion.div>
  );
}
