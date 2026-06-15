import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ChevronRightIcon as ChevronDown,
  MapPinIcon as MapPin,
  ZapIcon as Zap,
  NavigationIcon,
  XIcon as Square,
  Loader2,
  TrashIcon as Trash2,
  RefreshCcwIcon as RefreshCcw,
  ClockIcon as CalendarIcon,
} from "@/components/ui/icons";
import { syncRouteToCalendar } from "@/lib/calendar-sync";
import { Link } from "@tanstack/react-router";

interface MapHeaderProps {
  isLoading: boolean;
  routeId: string | undefined;
  availableRoutes: any[] | undefined;
  deliveries: any[] | undefined;
  optimizing: boolean;
  navigating: boolean;
  viewMode?: 'original' | 'optimized';
  isDeletingRoute?: boolean;
  onOptimize: () => void;
  onResetOptimization?: () => void;
  onStartNav: () => void;
  onStopNav: () => void;
  onDeleteRoute?: () => void;
}

export function MapHeader({
  isLoading,
  routeId,
  availableRoutes,
  deliveries,
  optimizing,
  navigating,
  viewMode = 'original',
  isDeletingRoute = false,
  onOptimize,
  onResetOptimization,
  onStartNav,
  onStopNav,
  onDeleteRoute,
}: MapHeaderProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-12 flex-1 rounded-full" />
          <Skeleton className="h-12 flex-1 rounded-full" />
        </div>
      </div>
    );
  }

  const selectedRouteName =
    availableRoutes?.find((r) => r.id === routeId)?.name || t("Selecione um roteiro", "Selecione um roteiro");

  return (
    <div className="flex flex-col gap-2 md:gap-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0">
          <div className="flex items-center gap-1.5 text-primary font-bold text-[8px] md:text-[9px] uppercase tracking-[0.2em]">
            <MapPin className="h-2.5 w-2.5" /> {t("Mapa Operacional", "Mapa Operacional")}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto p-0 hover:bg-transparent flex items-center gap-1.5 text-left group"
              >
                <h1 className="text-lg xs:text-xl lg:text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors truncate max-w-[150px] xs:max-w-[220px] lg:max-w-none">
                  {selectedRouteName}
                </h1>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-72 rounded-[32px] border-border/40 p-2 shadow-2xl bg-background/95 backdrop-blur-xl"
              align="start"
            >
              {availableRoutes?.map((r) => (
                <DropdownMenuItem
                  key={r.id}
                  asChild
                  className="rounded-2xl py-3 focus:bg-primary/10 focus:text-primary cursor-pointer"
                >
                  <Link to="/map" search={{ routeId: r.id }}>
                    <div className="flex flex-col">
                      <span className="font-bold">{r.name}</span>
                      <span className="text-[10px] uppercase font-black opacity-50">
                        {r.total_deliveries} {t("volumes", "volumes")}
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1.5">
          {routeId && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => syncRouteToCalendar(deliveries || [], selectedRouteName)}
              title="Sincronizar com Calendário (Android Auto)"
              className="h-9 w-9 xs:h-11 xs:w-11 rounded-full border-border/40 bg-background/60 text-primary hover:bg-primary/5"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
            </Button>
          )}
          
          {onDeleteRoute && (
            <Button
              variant="outline"
              size="icon"
              onClick={onDeleteRoute}
              disabled={!routeId || navigating || isDeletingRoute}
              className="h-9 w-9 xs:h-11 xs:w-11 rounded-full border-border/40 bg-background/60 text-destructive"
            >
              {isDeletingRoute ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          <Badge variant="outline" className="bg-background/40 border-border/20 font-bold px-2 py-0.5 rounded-full text-[8px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            {deliveries?.length ?? 0} {t("volumes", "volumes")}
          </Badge>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black px-2 py-0.5 rounded-full text-[8px] uppercase tracking-widest whitespace-nowrap">
            {deliveries?.filter((d) => d.status === "delivered").length ?? 0} ok
          </Badge>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-1 max-w-[320px] justify-end">
          {viewMode === 'optimized' && onResetOptimization && (
            <Button
              variant="outline"
              onClick={onResetOptimization}
              className="h-9 px-2 sm:px-3 xs:h-11 xs:px-4 rounded-full border-amber-500/30 bg-amber-500/10 text-amber-700 font-black text-[8px] xs:text-[10px] flex-none sm:flex-1"
            >
              <RefreshCcw className="h-3 w-3 xs:mr-1.5" />
              <span className="hidden sm:inline">{t("Resetar", "Resetar")}</span>
            </Button>
          )}

          <Button
            onClick={onOptimize}
            disabled={optimizing || !routeId}
            className="h-9 px-3 sm:px-4 xs:h-11 xs:px-6 rounded-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-black flex-1 text-[8px] xs:text-[10px] min-w-0"
          >
            {optimizing ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1 sm:mr-1.5 shrink-0" />
            ) : (
              <Zap className="h-3 w-3 mr-1 sm:mr-1.5 shrink-0" />
            )}
            <span className="truncate">{t("Otimizar", "Otimizar")}</span>
          </Button>

          <Button
            onClick={navigating ? onStopNav : onStartNav}
            variant={navigating ? "destructive" : "default"}
            className="h-9 px-3 sm:px-4 xs:h-11 xs:px-6 rounded-full font-black flex-1 text-[8px] xs:text-[10px] min-w-0"
          >
            {navigating ? (
              <Square className="h-3 w-3 mr-1 sm:mr-1.5 shrink-0" />
            ) : (
              <NavigationIcon className="h-3 w-3 mr-1 sm:mr-1.5 shrink-0" />
            )}
            <span className="truncate">{navigating ? t("Parar", "Parar") : t("Mapa", "Mapa")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
