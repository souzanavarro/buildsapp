import { useTranslation } from "react-i18next";
import { PremiumCard } from "./premium-card";
import { Activity, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface PerformanceOverviewProps {
  total: number;
  delivered: number;
  pending: number;
  delay?: number;
}

export function PerformanceOverview({ 
  total, 
  delivered, 
  pending, 
  delay = 0.4 
}: PerformanceOverviewProps) {
  const { t } = useTranslation();
  const progress = total > 0 ? Math.round((delivered / total) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <PremiumCard className="p-10 shadow-black/5 overflow-hidden group">
         <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 flex items-center gap-3 opacity-60">
            <Activity className="h-4 w-4 text-primary" /> {t("Performance Local", "Performance Local")}
         </h3>
         <div className="space-y-6">
            <div className="flex justify-between items-center group/item">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                     <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <span className="text-sm font-black tracking-tight text-foreground/80">{t("Concluídas", "Concluídas")}</span>
               </div>
               <span className="text-xl font-black">{delivered}</span>
            </div>
            
            <div className="flex justify-between items-center group/item">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                     <Clock className="h-5 w-5 text-sky-500" />
                  </div>
                  <span className="text-sm font-black tracking-tight text-foreground/80">{t("Em Aberto", "Em Aberto")}</span>
               </div>
               <span className="text-xl font-black">{pending}</span>
            </div>

            <div className="pt-8 space-y-3">
               <div className="flex justify-between items-end px-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t("Progresso Geral", "Progresso Geral")}</span>
                   <span className="text-sm font-black text-primary">
                     {progress}%
                   </span>
               </div>
               <div className="h-4 w-full bg-muted/30 rounded-full overflow-hidden p-1 border border-border/5 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.5, ease: "circOut", delay: delay + 0.2 }}
                    className="h-full bg-brand-gradient rounded-full shadow-[0_0_15px_rgba(255,140,0,0.3)]" 
                  />
               </div>
            </div>
         </div>
      </PremiumCard>
    </motion.div>
  );
}
