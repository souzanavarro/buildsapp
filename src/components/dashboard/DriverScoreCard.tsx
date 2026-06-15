import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, TrendingUp, ShieldAlert, Award } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DriverScoreCardProps {
  score?: number;
  rating?: number;
  badges?: Array<{ id: string; label: string; icon: string }>;
  successRate?: number;
  safetyScore?: number;
  className?: string;
}

export function DriverScoreCard({
  score = 0,
  rating = 5.0,
  badges = [],
  successRate = 0,
  safetyScore = 100,
  className
}: DriverScoreCardProps) {
  const { t } = useTranslation();

  const metrics = [
    { 
      label: t("Taxa de Sucesso", "Taxa de Sucesso"), 
      value: `${successRate}%`, 
      icon: TrendingUp, 
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
    { 
      label: t("Segurança", "Segurança"), 
      value: `${safetyScore}/100`, 
      icon: ShieldAlert, 
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-6", className)}
    >
      <Card className="rounded-[2.5rem] border-border/10 bg-card/40 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/5">
        <CardContent className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.25em] bg-primary/5 w-fit px-3 py-1 rounded-full border border-primary/10">
                <Trophy className="h-3 w-3" />
                {t("Nível Pro", "Nível Pro")}
              </div>
              <h3 className="text-2xl font-black tracking-tighter">{t("Sua Performance", "Sua Performance")}</h3>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black tracking-tighter text-primary">{score}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{t("Pontos Totais", "Pontos Totais")}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {metrics.map((m) => (
              <div key={m.label} className="p-4 rounded-2xl bg-muted/20 border border-border/5 space-y-3">
                <div className={cn("p-2 rounded-xl w-fit", m.bg, m.color)}>
                  <m.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-lg font-black tracking-tight">{m.value}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">{m.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
             <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70 flex items-center gap-2">
                <Award className="h-3.5 w-3.5" /> {t("Conquistas Recentes", "Conquistas Recentes")}
             </div>
             <div className="flex flex-wrap gap-2">
                {badges.length > 0 ? badges.map((b) => (
                  <Badge key={b.id} variant="secondary" className="rounded-xl px-4 py-1.5 font-bold text-[10px] gap-2 bg-primary/10 text-primary border-primary/20">
                    <Star className="h-3 w-3 fill-current" /> {b.label}
                  </Badge>
                )) : (
                  <div className="text-xs font-medium text-muted-foreground/50 italic py-2">
                    {t("Continue entregando para ganhar badges!", "Continue entregando para ganhar badges!")}
                  </div>
                )}
             </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
