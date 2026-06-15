import React from 'react';
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Trophy, Star, Zap, ShieldCheck, Target, Award } from "lucide-react";
import { motion } from "framer-motion";

interface PerformanceScoreProps {
  score: number;
  level: number;
  badges: string[];
  efficiency: number;
}

export const PerformanceScore = ({ score = 0, level = 1, badges = [], efficiency = 0 }: PerformanceScoreProps) => {
  const { t } = useTranslation();

  const metrics = [
    { label: t("Eficiência", "Eficiência"), value: `${efficiency}%`, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: t("Segurança", "Segurança"), value: "98/100", icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: t("Pontualidade", "Pontualidade"), value: "95%", icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <Card className="p-6 rounded-[2.5rem] bg-card border-none shadow-2xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
      
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
        {/* Main Score Circle */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-40 h-40 transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="74"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-muted/10"
            />
            <circle
              cx="80"
              cy="80"
              r="74"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={465}
              strokeDashoffset={465 - (465 * (score % 1000)) / 1000}
              className="text-primary transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("Nível", "Nível")} {level}</span>
            <span className="text-4xl font-black tracking-tighter">{score}</span>
            <span className="text-[10px] font-bold text-primary/70 uppercase">XP Total</span>
          </div>
          <div className="absolute -bottom-2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
            <Trophy className="h-3 w-3 inline mr-1" />
            {t("Mestre das Rotas", "Mestre das Rotas")}
          </div>
        </div>

        <div className="flex-1 space-y-6 w-full">
          <div className="grid grid-cols-3 gap-3">
            {metrics.map((m, i) => (
              <motion.div 
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn("p-3 rounded-2xl flex flex-col items-center gap-1", m.bg)}
              >
                <m.icon className={cn("h-4 w-4", m.color)} />
                <span className="text-[14px] font-black tracking-tighter">{m.value}</span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase text-center leading-none">{m.label}</span>
              </motion.div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest opacity-60">{t("Minhas Conquistas", "Minhas Conquistas")}</span>
              <span className="text-[11px] font-bold text-primary">{badges.length} / 12</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {badges.length > 0 ? (
                badges.map((b, i) => (
                  <div key={i} className="bg-muted/50 p-2 rounded-xl border border-border/10 flex items-center gap-2 group/badge hover:bg-primary/5 transition-all">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold truncate max-w-[80px]">{b}</span>
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-muted-foreground italic">{t("Continue entregando para ganhar badges!", "Continue entregando para ganhar badges!")}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
