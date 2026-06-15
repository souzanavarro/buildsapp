import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PremiumCard } from "./premium-card";
import { Input } from "./input";
import { Button } from "./button";
import { Label } from "./label";
import { DollarSign, Save, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface CostSimulatorProps {
  freightValue: string;
  tollsValue: string;
  onSaveFreight: (value: string) => void;
  onSaveTolls: (value: string) => void;
  isUpdating?: boolean;
  delay?: number;
}

export function CostSimulator({
  freightValue: initialFreight,
  tollsValue: initialTolls,
  onSaveFreight,
  onSaveTolls,
  isUpdating = false,
  delay = 0.25
}: CostSimulatorProps) {
  const { t } = useTranslation();
  const [freight, setFreight] = useState(initialFreight);
  const [tolls, setTolls] = useState(initialTolls);

  return (
    <div className="space-y-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
        <PremiumCard className="p-8 shadow-black/5 space-y-6">
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{t("Simulador de Custos", "Simulador de Custos")}</div>
                 <h3 className="text-xl font-black tracking-tighter">{t("Rentabilidade da Rota", "Rentabilidade da Rota")}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                 <DollarSign className="h-6 w-6" />
              </div>
           </div>

           <div className="space-y-5">
              <div className="space-y-3">
                 <Label htmlFor="freight" className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground ml-1 opacity-70">
                    {t("Valor do Frete (R$)", "Valor do Frete (R$)")}
                 </Label>
                 <div className="flex gap-3">
                    <div className="relative flex-1 group/input">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground/30 group-focus-within/input:text-primary transition-colors text-sm">R$</span>
                       <Input
                         id="freight"
                         type="text"
                         inputMode="decimal"
                         className="pl-10 h-14 rounded-2xl bg-muted/20 border-none font-black text-xl shadow-inner transition-all"
                         value={freight}
                         onChange={(e) => setFreight(e.target.value)}
                       />
                    </div>
                    <Button 
                     onClick={() => onSaveFreight(freight)} 
                     disabled={isUpdating}
                     className="h-14 w-14 rounded-2xl shadow-xl active:scale-95 transition-all shrink-0"
                    >
                      {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    </Button>
                 </div>
              </div>
              
              <div className="bg-muted/10 rounded-xl p-4 border border-border/5">
                 <p className="text-[10px] font-bold text-muted-foreground/60 leading-relaxed italic">
                    {t("O valor inserido será consolidado nos seus relatórios mensais para cálculo exato de rentabilidade por km.", "O valor inserido será consolidado nos seus relatórios mensais para cálculo exato de rentabilidade por km.")}
                 </p>
              </div>
           </div>
        </PremiumCard>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 0.1 }}>
        <PremiumCard className="p-8 shadow-xl">
           <Label htmlFor="tolls" className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-4 flex items-center gap-2 opacity-70">
              <DollarSign className="h-3.5 w-3.5" /> {t("Pedágios (R$)", "Pedágios (R$)")}
           </Label>
           <div className="flex gap-3">
             <div className="relative flex-1 group/input">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground/40 text-sm">R$</span>
               <Input
                 id="tolls"
                 inputMode="decimal"
                 className="pl-10 h-14 rounded-2xl bg-muted/20 border-none font-black text-xl"
                 value={tolls}
                 onChange={(e) => setTolls(e.target.value)}
               />
             </div>
             <Button
               onClick={() => onSaveTolls(tolls)}
               disabled={isUpdating}
               className="h-14 w-14 rounded-2xl shrink-0"
             >
               {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
             </Button>
           </div>
           <p className="text-[10px] font-bold text-muted-foreground/60 mt-3 leading-relaxed">
             {t("O total de pedágios será descontado do frete no cálculo do lucro líquido do dashboard.", "O total de pedágios será descontado do frete no cálculo do lucro líquido do dashboard.")}
           </p>
        </PremiumCard>
      </motion.div>
    </div>
  );
}
