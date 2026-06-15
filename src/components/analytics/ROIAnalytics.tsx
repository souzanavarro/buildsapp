import React, { useState, useMemo } from 'react';
import { PremiumCard } from "@/components/ui/premium-card";
import { useTranslation } from "react-i18next";
import { DollarIcon as DollarSign, TrendingUpIcon as TrendingUp, TrendingDownIcon as TrendingDown, TruckIcon as Fuel, SettingsIcon as Settings, SlidersIcon as Filter } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface ROIAnalyticsProps {
  totalFreight: number;
  totalDistance: number;
  initialFuelPrice?: number;
  initialKmPerLiter?: number;
}

export const ROIAnalytics = ({ 
  totalFreight = 0, 
  totalDistance = 0, 
  initialFuelPrice = 5.85, 
  initialKmPerLiter = 10 
}: ROIAnalyticsProps) => {
  const { t } = useTranslation();
  const [fuelPrice, setFuelPrice] = useState(initialFuelPrice);
  const [kmPerLiter, setKmPerLiter] = useState(initialKmPerLiter);
  const [maintenanceRate, setMaintenanceRate] = useState(0.15); // 15 cents per km

  const { fuelCost, maintenanceCost, netProfit, margin } = useMemo(() => {
    const fuel = kmPerLiter > 0 ? (totalDistance / kmPerLiter) * fuelPrice : 0;
    const maint = totalDistance * maintenanceRate;
    const profit = totalFreight - fuel - maint;
    const mgn = totalFreight > 0 ? (profit / totalFreight) * 100 : 0;

    return {
      fuelCost: fuel,
      maintenanceCost: maint,
      netProfit: profit,
      margin: mgn
    };
  }, [totalFreight, totalDistance, fuelPrice, kmPerLiter, maintenanceRate]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <PremiumCard className="p-5 xs:p-6 sm:col-span-2 lg:col-span-1">

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("Simulador de Custos", "Simulador de Custos")}</span>
              <Settings className="h-4 w-4 text-primary opacity-40" />
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">{t("Preço do Combustível (R$)", "Preço do Combustível (R$)")}</label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={fuelPrice} 
                  onChange={(e) => setFuelPrice(Number(e.target.value))}
                  className="rounded-xl border-none bg-muted/30 focus-visible:ring-primary/20 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">{t("Consumo Médio (KM/L)", "Consumo Médio (KM/L)")}</label>
                <Input 
                  type="number" 
                  step="0.1" 
                  value={kmPerLiter} 
                  onChange={(e) => setKmPerLiter(Number(e.target.value))}
                  className="rounded-xl border-none bg-muted/30 focus-visible:ring-primary/20 font-bold"
                />
              </div>
            </div>
          </div>
        </PremiumCard>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PremiumCard className="p-6 bg-emerald-500/5 shadow-lg border-emerald-500/10" blur={false}>
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-emerald-500/20">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{t("Lucro Líquido Real", "Lucro Líquido Real")}</span>
              </div>
              <div>
                <div className="text-3xl font-black tracking-tighter text-emerald-600">
                  R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-500">{margin.toFixed(1)}% Margem Operacional</span>
                </div>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard className="p-6 bg-amber-500/5 shadow-lg" blur={false}>
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-amber-500/20">
                  <Fuel className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">{t("Gasto Estimado", "Gasto Estimado")}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-bold">{t("Combustível", "Combustível")}:</span>
                  <span className="font-black">R$ {fuelCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-bold">{t("Manutenção", "Manutenção")}:</span>
                  <span className="font-black">R$ {maintenanceCost.toFixed(2)}</span>
                </div>
                <div className="h-px bg-amber-500/10 w-full my-1" />
                <div className="flex items-center justify-between text-[13px] font-black text-amber-700">
                  <span>Total:</span>
                  <span>R$ {(fuelCost + maintenanceCost).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
};
