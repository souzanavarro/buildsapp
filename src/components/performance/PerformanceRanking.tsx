import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Trophy, Medal, Star, ArrowUp, Zap, Shield } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";

interface RankingEntry {
  id: string;
  name: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  isMe?: boolean;
}

interface PerformanceRankingProps {
  drivers: RankingEntry[];
}

export const PerformanceRanking = ({ drivers = [] }: PerformanceRankingProps) => {
  const { t } = useTranslation();

  const sorted = [...drivers].sort((a, b) => b.score - a.score);

  return (
    <Card className="p-8 rounded-[2.5rem] bg-card border-none shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            {t("Ranking da Frota", "Ranking da Frota")}
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-8">
            {t("Os melhores motoristas do mês", "Os melhores motoristas do mês")}
          </p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-2xl flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-black text-primary uppercase">Temporada 04</span>
        </div>
      </div>

      <div className="space-y-4">
        {sorted.map((driver, index) => {
          const isTop3 = index < 3;
          return (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-4 rounded-3xl flex items-center gap-4 transition-all group",
                driver.isMe ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105" : "hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center font-black text-lg",
                index === 0 ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" :
                index === 1 ? "bg-slate-400 text-white shadow-lg shadow-slate-400/20" :
                index === 2 ? "bg-amber-700 text-white shadow-lg shadow-amber-700/20" :
                driver.isMe ? "bg-white/20" : "bg-muted"
              )}>
                {index + 1}
              </div>

              <Avatar className="h-12 w-12 border-2 border-white/20">
                <AvatarFallback className={driver.isMe ? "bg-white/20" : "bg-brand-gradient"}>
                  {driver.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="font-black text-sm flex items-center gap-2">
                  {driver.name}
                  {driver.isMe && <span className="bg-white/20 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest">Você</span>}
                </div>
                <div className={cn(
                  "text-[10px] font-bold flex items-center gap-1",
                  driver.isMe ? "opacity-70" : "text-muted-foreground"
                )}>
                  <Star className="h-3 w-3 fill-current" />
                  {driver.score.toLocaleString()} XP Coletado
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  {driver.trend === 'up' && <ArrowUp className="h-3 w-3 text-emerald-500" />}
                  <span className={cn("text-xs font-black", driver.isMe ? "text-white" : "text-foreground")}>
                    #{index + 1}
                  </span>
                </div>
                {isTop3 && (
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-1 w-1 rounded-full bg-current opacity-30" />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <Button className="w-full mt-8 h-12 rounded-2xl bg-muted hover:bg-muted/80 text-foreground font-black uppercase text-[10px] tracking-widest">
        Ver Todas as Temporadas
      </Button>
    </Card>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
