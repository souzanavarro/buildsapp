import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const FUEL_SETTINGS_KEY = "fuel-settings-v1";
export const DEFAULT_FUEL_PRICE = 6.62;
export const DEFAULT_KM_PER_LITER = 11;


export type FuelSettings = {
  fuelPrice: number;
  kmPerLiter: number;
};

export function loadFuelSettings(): FuelSettings {
  if (typeof window === "undefined") {
    return { fuelPrice: DEFAULT_FUEL_PRICE, kmPerLiter: DEFAULT_KM_PER_LITER };
  }
  try {
    const raw = localStorage.getItem(FUEL_SETTINGS_KEY);
    if (!raw) return { fuelPrice: DEFAULT_FUEL_PRICE, kmPerLiter: DEFAULT_KM_PER_LITER };
    const parsed = JSON.parse(raw);
    return {
      fuelPrice: Number(parsed.fuelPrice) > 0 ? Number(parsed.fuelPrice) : DEFAULT_FUEL_PRICE,
      kmPerLiter: Number(parsed.kmPerLiter) > 0 ? Number(parsed.kmPerLiter) : DEFAULT_KM_PER_LITER,
    };
  } catch {
    return { fuelPrice: DEFAULT_FUEL_PRICE, kmPerLiter: DEFAULT_KM_PER_LITER };
  }
}

interface FuelSettingsCardProps {
  settings: FuelSettings;
  onChange: (next: FuelSettings) => void;
  estimatedDistanceKm?: number;
  estimatedFuelCost?: number;
  readOnly?: boolean;
  readOnlyHint?: string;
}

export function FuelSettingsCard({
  settings,
  onChange,
  estimatedDistanceKm = 0,
  estimatedFuelCost = 0,
  readOnly = false,
  readOnlyHint,
}: FuelSettingsCardProps) {
  const { t } = useTranslation();
  const [fuelPrice, setFuelPrice] = useState(String(settings.fuelPrice));

  const [kmPerLiter, setKmPerLiter] = useState(String(settings.kmPerLiter));

  useEffect(() => {
    setFuelPrice(String(settings.fuelPrice));
    setKmPerLiter(String(settings.kmPerLiter));
  }, [settings.fuelPrice, settings.kmPerLiter]);

  const persistToProfile = async (price: number, km: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ fuel_price: price, km_per_liter: km } as any)
        .eq("user_id", user.id);
    } catch {
      // best-effort
    }
  };

  const handleSave = async () => {
    const price = Number(fuelPrice.replace(",", "."));
    const km = Number(kmPerLiter.replace(",", "."));
    if (!(price > 0) || !(km > 0)) {
      toast.error(t("Informe valores maiores que zero", "Informe valores maiores que zero"));
      return;
    }
    const next = { fuelPrice: price, kmPerLiter: km };
    localStorage.setItem(FUEL_SETTINGS_KEY, JSON.stringify(next));
    await persistToProfile(price, km);
    onChange(next);
    toast.success(t("Configuração de combustível atualizada", "Configuração de combustível atualizada"));
  };

  const handleReset = async () => {
    const next = { fuelPrice: DEFAULT_FUEL_PRICE, kmPerLiter: DEFAULT_KM_PER_LITER };
    localStorage.setItem(FUEL_SETTINGS_KEY, JSON.stringify(next));
    await persistToProfile(next.fuelPrice, next.kmPerLiter);
    onChange(next);
    toast.success(t("Valores padrão restaurados", "Valores padrão restaurados"));
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="rounded-[2.5rem] border-border/10 bg-card/40 backdrop-blur-xl shadow-xl">
        <CardHeader className="pb-3 pt-7 px-8">
          <CardTitle className="text-[11px] font-black flex items-center gap-3 text-muted-foreground uppercase tracking-[0.25em] opacity-80">
            <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
            {t("Custos de Combustível", "Custos de Combustível")}
          </CardTitle>
          <p className="text-xs text-muted-foreground/70 font-medium mt-1">
            {readOnly ? (readOnlyHint ?? t("Média das configurações de todos os usuários.", "Média das configurações de todos os usuários.")) : t("Ajuste para refletir o consumo real do seu veículo.", "Ajuste para refletir o consumo real do seu veículo.")}
          </p>

        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fuel-price" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                {t("Preço por litro (R$)", "Preço por litro (R$)")}
              </Label>
              <Input
                id="fuel-price"
                inputMode="decimal"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(e.target.value)}
                placeholder="6.62"
                disabled={readOnly}
              />

            </div>
            <div className="space-y-1.5">
              <Label htmlFor="km-liter" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                {t("KM por litro", "KM por litro")}
              </Label>
              <Input
                id="km-liter"
                inputMode="decimal"
                value={kmPerLiter}
                onChange={(e) => setKmPerLiter(e.target.value)}
                placeholder="10"
                disabled={readOnly}
              />

            </div>
          </div>

          <div className="rounded-2xl bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              {t("Distância est.", "Distância est.")}:{" "}
              <strong className="text-foreground">
                {estimatedDistanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km
              </strong>
            </span>
            <span>
              {t("Custo combustível", "Custo combustível")}:{" "}
              <strong className="text-foreground">
                R$ {estimatedFuelCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </strong>
            </span>
          </div>

          {!readOnly && (
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-widest">
                {t("Salvar", "Salvar")}
              </Button>
              <Button onClick={handleReset} variant="outline" className="h-11 rounded-xl font-bold text-xs uppercase tracking-widest">
                {t("Padrão", "Padrão")}
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </motion.div>
  );
}
