import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";
import { 
  PackageIcon as Package, ArrowRightIcon as ArrowRight, MapPinIcon as MapPin
} from "@/components/ui/icons";
import { motion } from "framer-motion";
import { usePrefetchRoute } from "@/hooks/queries/useRouteQueries";

interface CompactRouteListItemProps {
  route: any;
  index?: number;
}

export function CompactRouteListItem({ route, index = 0 }: CompactRouteListItemProps) {
  const { t } = useTranslation();
  const prefetchRoute = usePrefetchRoute();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 + index * 0.1 }}
    >
      <Link
        to="/routes/$id"
        params={{ id: route.id }}
        onMouseEnter={() => prefetchRoute(route.id)}
        className="flex items-center gap-4 sm:gap-6 p-4 sm:p-7 hover:bg-primary/5 transition-all duration-500 group relative overflow-hidden"
      >
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />

        <div className="h-10 w-10 xs:h-12 xs:w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl sm:rounded-2xl bg-muted/30 flex items-center justify-center transition-all duration-500 group-hover:bg-primary/20 group-hover:rotate-3 shadow-inner">
          <MapPin className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-primary/60 group-hover:text-primary transition-colors" />
        </div>


        <div className="flex-1 min-w-0 space-y-1">
          <div className="font-black text-base group-hover:text-primary transition-colors truncate tracking-tight">
            {route.name}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap">
              <Package className="h-3.5 w-3.5 mr-1.5 opacity-50" />
              {route.total_deliveries} Vol.
            </span>
            <div className="h-1 w-1 rounded-full bg-border shrink-0" />
            <StatusBadge status={route.status} className="px-3 py-1 text-[8px] xs:text-[9px]" />
          </div>
        </div>

        <div className="text-right shrink-0 hidden sm:block pr-2">
          <div className="text-lg font-black text-foreground tracking-tighter">
            R$ {Number(route.freight_value || 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
            {t("Frete Total", "Frete Total")}
          </div>
        </div>

        <div className="h-10 w-10 rounded-full border border-border/20 flex items-center justify-center text-muted-foreground/30 group-hover:text-primary group-hover:border-primary/30 group-hover:translate-x-1 transition-all duration-500">
          <ArrowRight className="h-5 w-5" />
        </div>
      </Link>
    </motion.div>
  );
}
