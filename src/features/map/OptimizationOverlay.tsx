import { motion } from "framer-motion";
import { Loader2, ZapIcon as Zap } from "@/components/ui/icons";

import { Progress } from "@/components/ui/progress";

interface OptimizationOverlayProps {
  optimizing: boolean;
  progress: number;
  stage: string;
}

export function OptimizationOverlay({ optimizing, progress, stage }: OptimizationOverlayProps) {
  if (!optimizing) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-[6000] bg-background/80 backdrop-blur-md flex items-center justify-center p-8 rounded-[2.5rem]"
    >
       <div className="max-w-md w-full space-y-8 text-center">
          <motion.div 
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="h-24 w-24 rounded-3xl bg-amber-500 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/30"
          >
             <Zap className="h-12 w-12 text-amber-950 fill-current" />
          </motion.div>
          
          <div className="space-y-3">
             <h3 className="text-3xl font-black tracking-tight">{stage}</h3>
             <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">{progress}% concluído</p>
          </div>
          
          <div className="space-y-4">
             <Progress value={progress} className="h-4 rounded-full bg-amber-500/10" />
             <p className="text-xs text-muted-foreground/60 font-medium italic">
                "Estamos organizando sua rota para garantir o menor tempo de viagem possível."
             </p>
          </div>
       </div>
    </motion.div>
  );
}
