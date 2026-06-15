import React from "react";
import { Button } from "@/components/ui/button";
import { Navigation, CheckCircle2, AlertTriangle, Phone, ChevronRight, X } from "lucide-react";
import { motion } from "framer-motion";
import { expandAddressAbbreviations } from "@/lib/address-normalization";
import { openNavigationApp } from "@/lib/native-utils";

interface DrivingModeOverlayProps {
  currentStop: any;
  onComplete: (id: string) => void;
  onProblem: (id: string) => void;
  onClose: () => void;
}

export function DrivingModeOverlay({ currentStop, onComplete, onProblem, onClose }: DrivingModeOverlayProps) {
  if (!currentStop) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[6000] bg-black flex flex-col p-6"
    >
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-white shadow-2xl">
            <span className="text-2xl font-black">{currentStop.sequence}</span>
          </div>
          <div>
            <div className="text-primary font-black text-xs uppercase tracking-[0.3em]">Em Percurso</div>
            <div className="text-white/50 text-xs font-bold">{currentStop.neighborhood}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-12 w-12 rounded-full bg-white/10 text-white">
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-8">
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none mb-4">
          {expandAddressAbbreviations(currentStop.destination_address)}
        </h1>

        <div className="grid grid-cols-1 gap-6">
          <Button 
            className="h-28 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-6 shadow-2xl shadow-blue-500/20 active:scale-95 transition-all"
            onClick={() => openNavigationApp(currentStop.latitude, currentStop.longitude)}
          >
            <Navigation className="h-10 w-10 fill-current" />
            <span className="text-3xl font-black uppercase tracking-tighter">Navegar</span>
          </Button>

          <div className="grid grid-cols-2 gap-6">
            <Button 
              className="h-24 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex flex-col items-center justify-center gap-2 shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all"
              onClick={() => onComplete(currentStop.id)}
            >
              <CheckCircle2 className="h-8 w-8" />
              <span className="text-lg font-black uppercase tracking-widest text-[10px]">Entregue</span>
            </Button>

            <Button 
              className="h-24 rounded-full bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center gap-2 shadow-2xl shadow-red-500/20 active:scale-95 transition-all"
              onClick={() => onProblem(currentStop.id)}
            >
              <AlertTriangle className="h-8 w-8" />
              <span className="text-lg font-black uppercase tracking-widest text-[10px]">Problema</span>
            </Button>
          </div>

          <Button 
            variant="outline"
            className="h-16 rounded-full border-white/20 bg-white/5 text-white flex items-center justify-center gap-4 hover:bg-white/10 active:scale-95 transition-all"
          >
            <Phone className="h-6 w-6" />
            <span className="text-xl font-black uppercase tracking-widest text-xs">Ligar para Cliente</span>
          </Button>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between text-white/40">
        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Sistema Online
        </div>
        <div className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
          Próxima Parada <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </motion.div>
  );
}
