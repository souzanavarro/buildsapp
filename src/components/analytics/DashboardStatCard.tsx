import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightIcon as ArrowUpRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";


interface DashboardStatCardProps {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bg: string;
  description: string;
  isLoading?: boolean;
  delay?: number;
}

export const DashboardStatCard = memo(({ 
  label, value, icon: Icon, color, bg, description, isLoading, delay = 0 
}: DashboardStatCardProps) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay, 
        duration: 0.6, 
        ease: [0.16, 1, 0.3, 1] 
      }}
    >
      <Card className="relative overflow-hidden group border-border/10 hover:border-primary/40 transition-all duration-700 rounded-xl xs:rounded-2xl bg-card/40 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:shadow-primary/5 group/card">
        <CardContent className="p-3 xs:p-6">
          <div className="flex items-start justify-between">
            <div className={cn(
              "p-2.5 xs:p-4 rounded-lg xs:rounded-xl transition-all duration-700 shadow-xl shadow-black/5 group-hover/card:scale-110 group-hover/card:rotate-3", 
              bg
            )}>
              <Icon className={cn("h-7 w-7", color)} />
            </div>
            <div className="flex h-8 w-8 xs:h-10 xs:w-10 items-center justify-center rounded-full bg-primary/5 text-primary opacity-0 group-hover/card:opacity-100 transition-all duration-500 transform translate-x-2 group-hover/card:translate-x-0">
               <ArrowUpRight className="h-4 w-4 xs:h-5 xs:w-5" />
            </div>
          </div>
          
          <div className="mt-4 xs:mt-8 space-y-1 xs:space-y-2">
            <h3 className="text-[9px] xs:text-[11px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-60 truncate">{label}</h3>
            <div className="text-2xl xs:text-4xl font-black tracking-tighter text-foreground flex items-baseline gap-1.5 transition-all duration-500 group-hover/card:translate-x-1">
              {isLoading ? (
                <Skeleton className="h-10 w-32 rounded-lg bg-muted/40" />
              ) : (
                <span className="bg-clip-text transition-colors">
                  {value}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 xs:gap-2 pt-1 xs:pt-2">
               <div className="flex h-4 w-4 xs:h-5 xs:w-5 items-center justify-center rounded-full bg-emerald-500/10 shadow-inner">
                  <div className="h-1 w-1 xs:h-1.5 xs:w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
               </div>
               <p className="text-[8px] xs:text-[11px] font-bold text-muted-foreground/60 tracking-tight truncate">{t(description, description)}</p>
            </div>
          </div>
        </CardContent>
        
        {/* Background Decorative Icon */}
        <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover/card:opacity-[0.06] transition-all duration-1000 transform group-hover/card:scale-125 group-hover/card:-rotate-12 pointer-events-none">
           <Icon className="h-32 w-32" />
        </div>
        
        {/* Bottom subtle gradient line */}
        <div className={cn(
          "absolute bottom-0 left-0 h-[3px] w-0 transition-all duration-1000 group-hover/card:w-full",
          "bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        )} />
      </Card>
    </motion.div>
  );
});

DashboardStatCard.displayName = "DashboardStatCard";
