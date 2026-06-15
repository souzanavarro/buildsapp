import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { PlayCircle, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";

export const SystemTutorialVideo = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.8 }}
      className="mb-6"
    >
      <Link to="/tutorial">
        <Card className="rounded-[2.5rem] border-border/10 bg-card/30 backdrop-blur-xl overflow-hidden shadow-2xl hover:shadow-primary/5 transition-all group">
          <div className="flex flex-col">
            <div className="relative aspect-video bg-muted/50 flex items-center justify-center cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-transparent z-10" />
              <img 
                src="https://images.unsplash.com/photo-1586769852044-692d6e3703a0?auto=format&fit=crop&q=80&w=800" 
                alt="Preview do Tutorial" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              <div className="relative z-20 flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl transition-transform duration-500 group-hover:scale-110">
                  <PlayCircle className="h-7 w-7 text-white fill-white" />
                </div>
                <span className="text-white font-black text-[9px] uppercase tracking-widest drop-shadow-md">Assistir Tutorial</span>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-[0.2em] bg-primary/10 w-fit px-3 py-1 rounded-full">
                <Info className="h-3 w-3" />
                Aprenda a Usar
              </div>
              <h3 className="text-lg font-black tracking-tighter leading-tight">
                Domine o <span className="text-brand-gradient">Rota Certa</span>
              </h3>
              <p className="text-muted-foreground font-medium text-xs leading-relaxed line-clamp-2">
                Descubra como otimizar suas rotas e gerenciar suas entregas com eficiência máxima.
              </p>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
};
