import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useQueryClient } from "@tanstack/react-query";
import { useRoutes } from "@/hooks/queries/useRouteQueries";
import { useRouteMutations } from "@/hooks/useRouteMutations";
import { useRouteFilter } from "@/hooks/useRouteFilter";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { PremiumCard } from "@/components/ui/premium-card";
import { RouteStatItem } from "@/components/ui/route-stat-item";
import { StatusBadge } from "@/components/ui/status-badge";
import { RouteListItem } from "@/components/ui/route-list-item";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateBR } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapIcon, DollarIcon as DollarSign, ClockIcon as CalendarIcon, 
  PackageIcon as Package, ChevronRightIcon as ChevronRight, SearchIcon as Search, SlidersIcon as Filter, TruckIcon as Truck,
  TrashIcon as Trash2, AlertTriangleIcon as AlertTriangle, Loader2, SparklesIcon as Sparkles, SlidersIcon as SlidersHorizontal
} from "@/components/ui/icons";

import { useDateFilter } from "@/contexts/DateFilterContext";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/routes/")({ component: () => <AppShell><Routes /></AppShell> });

function Routes() {
  const { t } = useTranslation();
  const { formattedRange } = useDateFilter();

  const qc = useQueryClient();
  const { deleteRoute, isDeleting } = useRouteMutations();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const { data: routes, isLoading, error } = useRoutes(formattedRange);
  const { searchTerm, setSearchTerm, filteredRoutes } = useRouteFilter(routes);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteRoute({ id: deletingId });
      setDeletingId(null);
    } catch (error) {
      // Handled by hook
    }
  };



  return (
    <div className="space-y-10 pb-32 lg:pb-12">
      {/* Dynamic Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 pb-8 border-b border-border/10 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2 relative z-10"
        >
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em] mb-2 bg-primary/5 w-fit px-3 py-1 rounded-full border border-primary/10 shadow-inner">
             <div className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
             {t("Roteiros Gerados", "Roteiros Gerados")}
          </div>
          <h1 className="text-4xl xs:text-5xl font-black tracking-tighter leading-tight text-foreground">
             {t("Seu", "Seu")} <span className="text-brand-gradient">{t("Arquivo", "Arquivo")}</span>
          </h1>
          <p className="text-muted-foreground font-medium text-sm xs:text-base max-w-xl leading-relaxed opacity-80">
             {t("Gerencie o histórico das suas operações Shopee e analise o desempenho das rotas.", "Gerencie o histórico das suas operações Shopee e analise o desempenho das rotas.")}
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 relative z-10"
        >
           <div className="relative group flex-1 sm:flex-initial">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 xs:h-5 xs:w-5 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
              <Input 
                placeholder={t("Buscar por nome ou código...", "Buscar por nome ou código...")} 
                className="pl-12 h-12 xs:h-14 w-full sm:w-80 rounded-xl xs:rounded-2xl bg-card/40 backdrop-blur-xl border-border/10 focus-visible:ring-primary/40 focus-visible:border-primary/40 shadow-xl shadow-black/5 font-bold transition-all placeholder:font-medium text-sm xs:text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <Button variant="outline" className="h-12 w-12 xs:h-14 xs:w-14 rounded-xl xs:rounded-2xl border-border/10 bg-card/40 backdrop-blur-xl hover:bg-accent shadow-xl shadow-black/5 group shrink-0">
              <SlidersHorizontal className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
           </Button>
        </motion.div>

        <div className="absolute top-0 right-1/4 h-64 w-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none opacity-50" />
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xs:gap-8">
           {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64 xs:h-72 rounded-2xl xs:rounded-[2.5rem] bg-muted/40 shadow-inner" />
           ))}
        </div>
      ) : error ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 xs:py-32 text-center bg-destructive/5 rounded-2xl xs:rounded-[3rem] border-2 border-dashed border-destructive/10 px-6"
        >
           <div className="bg-background/80 backdrop-blur-md p-10 rounded-full shadow-2xl mb-8 border border-border/10">
              <AlertTriangle className="h-16 w-16 text-destructive animate-pulse" />
           </div>
           <h3 className="text-3xl font-black mb-4 tracking-tighter">{t("Sincronização Interrompida", "Sincronização Interrompida")}</h3>
           <p className="text-muted-foreground font-medium text-lg max-w-md mx-auto mb-10 leading-relaxed">
              {t("Não conseguimos carregar seus roteiros no momento. Por favor, verifique sua conexão ou tente novamente.", "Não conseguimos carregar seus roteiros no momento. Por favor, verifique sua conexão ou tente novamente.")}
           </p>
           <Button 
             variant="outline" 
             size="lg"
             className="rounded-2xl h-14 px-10 font-black tracking-widest uppercase text-xs border-border/20 shadow-xl"
             onClick={() => qc.invalidateQueries({ queryKey: ["routes"] })}
           >
             {t("Forçar Atualização", "Forçar Atualização")}
           </Button>
        </motion.div>
      ) : !filteredRoutes?.length ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-32 xs:py-40 text-center bg-muted/5 rounded-2xl xs:rounded-[3rem] border-2 border-dashed border-border/10 relative overflow-hidden px-6"
        >
           <div className="bg-background/80 backdrop-blur-md p-10 rounded-full shadow-2xl mb-8 border border-border/10 relative z-10">
              <MapIcon className="h-16 w-16 text-muted-foreground/20" />
           </div>
           <h3 className="text-3xl font-black mb-4 tracking-tighter relative z-10">{t("Arquivo Vazio", "Arquivo Vazio")}</h3>
           <p className="text-muted-foreground font-medium text-lg max-w-sm mx-auto mb-10 leading-relaxed relative z-10">
              {t("Nenhum roteiro foi encontrado para os critérios selecionados. Tente ajustar os filtros ou criar uma nova rota.", "Nenhum roteiro foi encontrado para os critérios selecionados. Tente ajustar os filtros ou criar uma nova rota.")}
           </p>
           <Link to="/upload" className="relative z-10">
              <Button variant="premium" size="lg" className="rounded-2xl">
                 {t("Iniciar Primeiro Roteiro", "Iniciar Primeiro Roteiro")}
              </Button>
           </Link>
           <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 xs:gap-8 pb-32 lg:pb-0 px-2 xs:px-0">
          <AnimatePresence mode="popLayout">
            {filteredRoutes.map((r: any, idx: number) => (
              <RouteListItem 
                key={r.id} 
                route={r} 
                index={idx} 
                onDelete={(id) => setDeletingId(id)} 
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Confirmation with Premium Styling */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="rounded-2xl xs:rounded-[3rem] border-border/20 p-6 xs:p-10 backdrop-blur-3xl bg-background/90 shadow-2xl animate-in fade-in zoom-in-95 duration-300 max-w-lg w-[calc(100%-2rem)]">
          <AlertDialogHeader className="space-y-6">
            <div className="h-16 w-16 xs:h-24 xs:w-24 rounded-xl xs:rounded-[2rem] bg-destructive/10 flex items-center justify-center text-destructive mx-auto shadow-inner mb-2">
               <AlertTriangle className="h-10 w-10 animate-float" />
            </div>
            <div className="text-center space-y-2">
              <AlertDialogTitle className="text-2xl xs:text-3xl font-black tracking-tighter text-foreground leading-tight">
                 {t("Confirmar Exclusão?", "Confirmar Exclusão?")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-sm xs:text-lg font-medium leading-relaxed px-2">
                 {t("Este roteiro será removido permanentemente. Todas as provas de entrega e métricas vinculadas serão perdidas.", "Este roteiro será removido permanentemente. Todas as provas de entrega e métricas vinculadas serão perdidas.")}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-4 sm:justify-center mt-10">
            <AlertDialogCancel className="rounded-xl xs:rounded-2xl h-12 xs:h-14 px-4 xs:px-8 font-black uppercase tracking-widest text-[9px] xs:text-[11px] border-border/40 hover:bg-accent transition-all">{t("Manter", "Manter")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="rounded-xl xs:rounded-2xl h-12 xs:h-14 px-4 xs:px-8 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase tracking-widest text-[9px] xs:text-[11px] shadow-xl shadow-destructive/20 transition-all flex items-center gap-2 xs:gap-3 border-none"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("Confirmar Exclusão", "Confirmar Exclusão")}

            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
