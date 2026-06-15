import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PremiumCard } from "./premium-card";
import { StatusBadge } from "./status-badge";
import { Button } from "./button";
import { formatDateBR } from "@/lib/format";
import { 
  MapIcon, DollarIcon as DollarSign, ClockIcon as CalendarIcon, 
  PackageIcon as Package, ChevronRightIcon as ChevronRight, TrashIcon as Trash2
} from "@/components/ui/icons";
import { usePrefetchRoute } from "@/hooks/queries/useRouteQueries";
import { motion } from "framer-motion";

interface RouteListItemProps {
  route: any;
  onDelete?: (id: string) => void;
  index?: number;
}

export function RouteListItem({ route, onDelete, index = 0 }: RouteListItemProps) {
  const { t } = useTranslation();
  const prefetchRoute = usePrefetchRoute();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ 
        delay: index * 0.05,
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1]
      }}
      className="h-full"
    >
      <Link 
        to="/routes/$id" 
        params={{ id: route.id }} 
        onMouseEnter={() => prefetchRoute(route.id)}
        className="group block h-full"
      >
        <PremiumCard className="hover:-translate-y-3 group/card ring-1 ring-border/5 h-full">
          <div className="p-6 xs:p-8 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6 xs:mb-10">
               <div className="h-12 w-12 xs:h-14 xs:w-14 rounded-xl xs:rounded-2xl bg-primary/10 flex items-center justify-center text-primary transition-all duration-700 group-hover/card:scale-110 group-hover/card:rotate-6 shadow-inner shadow-primary/5">
                  <MapIcon className="h-8 w-8" />
               </div>
               <StatusBadge status={route.status} />
            </div>

            <h3 className="text-xl xs:text-2xl font-black tracking-tight mb-6 xs:mb-8 group-hover/card:text-primary transition-all duration-500 leading-tight min-h-[3rem] xs:min-h-[4rem]">
              {route.name}
            </h3>

            <div className="space-y-4 xs:space-y-5 mt-auto pt-6 xs:pt-10 border-t border-border/5">
              <div className="flex items-center justify-between group/info">
                 <div className="flex items-center text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] transition-colors group-hover/info:text-primary/60">
                    <CalendarIcon className="h-4 w-4 mr-3" /> {t("Data Base", "Data Base")}
                 </div>
                 <div className="text-sm font-black text-foreground/80 tracking-tight">{formatDateBR(route.route_date)}</div>
              </div>
              
              <div className="flex items-center justify-between group/info">
                 <div className="flex items-center text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] transition-colors group-hover/info:text-primary/60">
                    <Package className="h-4 w-4 mr-3" /> {t("Entregas", "Entregas")}
                 </div>
                 <div className="text-sm font-black text-foreground/80 tracking-tight">{route.total_deliveries} {t("volumes", "volumes")}</div>
              </div>

              {route.freight_value && Number(route.freight_value) > 0 ? (
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center text-[11px] font-black text-amber-500 uppercase tracking-[0.2em]">
                     <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center mr-3">
                        <DollarSign className="h-4 w-4" />
                     </div>
                     {t("Ganhos Totais", "Ganhos Totais")}
                  </div>
                  <div className="text-2xl xs:text-3xl font-black text-amber-500 tracking-tighter leading-none group-hover/card:scale-105 transition-transform duration-500">
                     R$ {Number(route.freight_value).toFixed(2)}
                  </div>
                </div>
              ) : (
                <div className="pt-4">
                   <div className="h-14 w-full bg-muted/20 rounded-[1.25rem] border border-border/5 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 italic shadow-inner">
                      {t("Sem frete informado", "Sem frete informado")}
                   </div>
                </div>
              )}
            </div>
            
            <div className="pt-8 flex gap-4">
              {onDelete && (
                <Button 
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(route.id);
                  }}
                  className="flex-1 h-12 xs:h-14 rounded-xl xs:rounded-2xl border-border/20 bg-background/50 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-500 text-[10px] xs:text-[11px] font-black uppercase tracking-widest shadow-sm"
                >
                  <Trash2 className="h-4 w-4 mr-2.5" /> {t("Excluir", "Excluir")}
                </Button>
              )}
              <Button 
                variant="secondary"
                className="h-12 w-12 xs:h-14 xs:w-14 rounded-xl xs:rounded-2xl p-0 flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-90 bg-muted/40 hover:bg-primary hover:text-white shadow-sm shrink-0 ml-auto"
              >
                 <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          </div>
          
          <div className="absolute -right-10 -top-10 h-32 w-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000" />
        </PremiumCard>
      </Link>
    </motion.div>
  );
}
