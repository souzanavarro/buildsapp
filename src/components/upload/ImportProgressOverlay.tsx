import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Loader2 } from "@/components/ui/icons";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface ImportProgressOverlayProps {
  loading: boolean;
  uploadStage: string;
  progress: number;
  timeRemaining: string;
  attempt?: number;
  canCancel?: boolean;
  onCancel?: () => void;
  logs?: string[];
}

export function ImportProgressOverlay({
  loading,
  uploadStage,
  progress,
  timeRemaining,
  attempt = 0,
  canCancel = false,
  onCancel,
  logs = [],
}: ImportProgressOverlayProps) {
  const { t } = useTranslation();
  const [isLogsVisible, setIsLogsVisible] = useState(false);


  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-3xl flex items-center justify-center p-4"
        >
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full md:h-auto overflow-y-auto pt-8 md:pt-0">
            <div className="space-y-6 xs:space-y-8 text-center md:text-left">
              <motion.div
                initial={{ scale: 0.5, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="relative inline-block"
              >
                <div className="h-20 w-20 xs:h-24 xs:w-24 rounded-2xl xs:rounded-[2rem] bg-brand-gradient flex items-center justify-center shadow-2xl shadow-primary/40">
                  <Loader2 className="h-10 w-10 xs:h-12 xs:w-12 text-primary-foreground animate-spin" />
                </div>
              </motion.div>

              <div className="space-y-2 xs:space-y-3 px-4 md:px-0">
                <h2 className="text-xl xs:text-3xl font-black tracking-tight leading-tight">{t(uploadStage, uploadStage)}</h2>
                <p className="text-muted-foreground font-bold text-[10px] xs:text-sm tracking-widest uppercase opacity-70">
                  {t(timeRemaining || "Processando dados...", timeRemaining || "Processando dados...")}

                </p>
                {attempt > 1 && (
                  <p className="text-[10px] xs:text-xs font-bold uppercase tracking-widest text-amber-600">
                    {t("Tentativa", "Tentativa")} {attempt} {t("de", "de")} 3
                  </p>
                )}
              </div>

              <div className="space-y-4 max-w-sm mx-auto md:mx-0 px-6 md:px-0">
                <div className="flex justify-between text-[9px] xs:text-[10px] font-black uppercase tracking-widest text-primary">
                  <span>{t("Progresso", "Progresso")}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-3 rounded-full bg-primary/10" />
              </div>

              <div className="flex flex-col gap-3 px-8 md:px-0">
                {canCancel && onCancel && (
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    className="rounded-xl h-12 font-black text-xs uppercase tracking-widest border-border/10"
                  >
                    {t("Cancelar Operação", "Cancelar Operação")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setIsLogsVisible(!isLogsVisible)}
                  className="rounded-xl font-black text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 h-10"
                >
                  {isLogsVisible ? t("Ocultar Monitor", "Ocultar Monitor") : t("Ver Console Operacional", "Ver Console Operacional")}
                </Button>
              </div>

              <p className="text-[10px] xs:text-xs text-muted-foreground/60 font-medium italic px-8 md:px-0 leading-relaxed">
                {t("Preparando roteiro... Você pode sair a qualquer momento sem perder os dados.", "Preparando roteiro... Você pode sair a qualquer momento sem perder os dados.")}
              </p>
            </div>

            {/* Logs Panel */}
            <AnimatePresence>
              {isLogsVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-black/90 rounded-2xl xs:rounded-[2rem] p-5 xs:p-6 font-mono text-[9px] xs:text-[10px] text-emerald-500/90 h-[250px] xs:h-[400px] overflow-y-auto border border-white/5 shadow-2xl space-y-2 scrollbar-thin scrollbar-thumb-white/10 mb-8 md:mb-0"
                >
                  <div className="flex items-center gap-2 mb-4 text-emerald-500 font-bold border-b border-emerald-500/20 pb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t("CONSOLE OPERACIONAL V1", "CONSOLE OPERACIONAL V1")}
                  </div>
                  {logs.length === 0 ? (
                    <div className="opacity-40 italic">{t("Aguardando telemetria...", "Aguardando telemetria...")}</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="leading-relaxed border-l border-emerald-500/10 pl-3">
                        {log}
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
