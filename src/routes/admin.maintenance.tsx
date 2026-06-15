import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { adminService } from "@/services/api";
import { PremiumCard } from "@/components/ui/premium-card";
import { MaintenanceCard } from "@/components/ui/maintenance-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, History, Truck, Search, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/admin/maintenance")({
  component: () => <AppShell><MaintenancePage /></AppShell>,
});


function MaintenancePage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["admin-maintenance-drivers"],
    queryFn: () => adminService.getMaintenanceData(),
  });

  const filteredDrivers = useMemo(() => 
    drivers?.filter(d => d.full_name?.toLowerCase().includes(searchTerm.toLowerCase())),
    [drivers, searchTerm]
  );

  return (
    <div className="space-y-10 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border/10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em] bg-primary/5 w-fit px-3 py-1 rounded-full border border-primary/10">
            <Wrench className="h-3 w-3" /> {t("Gestão de Frota", "Gestão de Frota")}
          </div>
          <h1 className="text-4xl font-black tracking-tighter">{t("Saúde dos Veículos", "Saúde dos Veículos")}</h1>
          <p className="text-muted-foreground font-medium">{t("Monitore a quilometragem e alertas de manutenção dos motoristas.", "Monitore a quilometragem e alertas de manutenção dos motoristas.")}</p>
        </div>

        <div className="relative group">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
           <Input 
             placeholder={t("Buscar motorista...", "Buscar motorista...")}
             className="pl-12 h-12 w-full md:w-80 rounded-2xl bg-card/40 backdrop-blur-xl border-border/10"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1,2,3].map(i => <Card key={i} className="h-64 rounded-3xl animate-pulse bg-muted/20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredDrivers?.map((d, idx) => (
              <MaintenanceCard key={d.user_id} driver={d as any} index={idx} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
