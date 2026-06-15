import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TruckIcon as Truck } from "@/components/ui/icons";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";


export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      throw redirect({ to: "/dashboard", replace: true });
    } else {
      throw redirect({ to: "/auth", replace: true });
    }
  },
  component: () => {
    const { t } = useTranslation();
    return (

    <div className="flex min-h-[100dvh] items-center justify-center bg-background relative overflow-hidden">
      {/* Background Decorative elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
      
      <div className="flex flex-col items-center gap-8 relative z-10">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="bg-brand-gradient p-8 rounded-[2.5rem] shadow-[0_30px_60px_-10px_rgba(255,140,0,0.3)] animate-float"
        >
           <Truck className="h-14 w-14 text-white" />
        </motion.div>
        
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl font-black tracking-tighter text-foreground leading-none">Rota Certa</div>
          <div className="flex items-center gap-3 text-muted-foreground/60 font-black tracking-[0.4em] text-[10px] uppercase animate-pulse">
            {t("Sincronizando Dados...", "Sincronizando Dados...")}
          </div>
        </div>
      </div>
    </div>
    );
  },
});

