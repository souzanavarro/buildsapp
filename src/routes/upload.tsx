import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TemplatesIcon as FileSpreadsheet, DollarIcon as DollarSign, AlertTriangleIcon as AlertCircle, InfoIcon as Info, ArrowRightIcon as ArrowRight, SecurityIcon as ShieldCheck, ZapIcon as Zap, StarIcon as Star, SecurityIcon as Shield, SparklesIcon as Sparkles
} from "@/components/ui/icons";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { parseShopeeXlsx, type ParseResult } from "@/lib/parse-shopee-xlsx";
import { toast } from "sonner";
import { useRouteImport } from "@/hooks/useRouteImport";
import { ManualDeliveryForm } from "@/components/upload/ManualDeliveryForm";
import { DropzoneArea } from "@/components/upload/DropzoneArea";
import { ImportProgressOverlay } from "@/components/upload/ImportProgressOverlay";
import { DeliveryItem } from "@/components/upload/DeliveryItem";
import { EditDeliveryModal } from "@/components/upload/EditDeliveryModal";

export const Route = createFileRoute("/upload")({
  ssr: false,
  component: () => <AppShell><Upload /></AppShell>,
});

function Upload() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [file, setFile] = useState<File | null>(null);

  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [freightValue, setFreightValue] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const sourceLabel = file?.name || "Entregas manuais";

  const { importRoute, cancel, loading, uploadStage, progress, timeRemaining, attempt, canCancel, logs } = useRouteImport();


  const handleFileSelect = async (f: File) => {
    setFile(f);
    setIsParsing(true);
    setParseProgress(0);
    try {
      const result = await parseShopeeXlsx(f, (p) => setParseProgress(p));
      setParsed(result);
      
      const totalFreight = result.valid.reduce((sum, d) => sum + (d.freight_value || 0), 0);
      if (totalFreight > 0) {
        setFreightValue(totalFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
        toast.success(`${result.valid.length} entregas e R$ ${totalFreight.toFixed(2)} identificados!`);
      } else if (result.valid.length === 0) {
        toast.error("Nenhuma entrega encontrada");
      } else {
        toast.success(`${result.valid.length} entregas identificadas!`);
      }
    } catch (e: any) {
      toast.error("Erro ao ler planilha: " + e.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddManualDelivery = (newDelivery: any) => {
    setParsed(prev => {
      if (!prev) return { total: 1, valid: [newDelivery], invalid: 0, warnings: [] };
      
      // Duplicate detection by address
      const existingIdx = prev.valid.findIndex(d => 
        d.destination_address === newDelivery.destination_address &&
        d.neighborhood === newDelivery.neighborhood &&
        d.city === newDelivery.city
      );

      if (existingIdx > -1) {
        const updated = [...prev.valid];
        updated[existingIdx] = {
          ...updated[existingIdx],
          package_count: (updated[existingIdx].package_count || 1) + 1,
          // We could keep track of multiple TNs if needed, but for now just count
        };
        toast.info("Endereço repetido: pacote adicionado à parada existente.");
        return { ...prev, valid: updated };
      }

      return {
        ...prev,
        total: prev.total + 1,
        valid: [...prev.valid, newDelivery]
      };
    });
  };

  const handleAddBatchDeliveries = (newDeliveries: any[]) => {
    newDeliveries.forEach(d => handleAddManualDelivery(d));
  };

  const handleUpdateDelivery = (index: number, updatedData: any) => {
    setParsed(prev => {
      if (!prev) return prev;
      const updated = [...prev.valid];
      updated[index] = { ...updated[index], ...updatedData };
      return { ...prev, valid: updated };
    });
  };

  const handleRemoveDelivery = (index: number) => {
    setParsed(prev => {
      if (!prev) return prev;
      const updated = prev.valid.filter((_, i) => i !== index);
      return { ...prev, total: prev.total - 1, valid: updated };
    });
  };

  const handleCreateRoute = () => {
    if (!parsed || parsed.valid.length === 0) {
      toast.error("Nenhuma entrega válida para criar o roteiro.");
      return;
    }
    if (!auth.user) {
      toast.error("Sua sessão expirou. Faça login novamente.");
      return;
    }
    importRoute(file, parsed, freightValue, auth.user.id);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-24">
      <ImportProgressOverlay 
        loading={loading}
        uploadStage={uploadStage}
        progress={progress}
        timeRemaining={timeRemaining}
        attempt={attempt}
        canCancel={canCancel}
        onCancel={cancel}
        logs={logs}
      />

      {/* Header Section with Motion */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-border/10 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2 relative z-10"
        >
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.25em] mb-3 bg-primary/5 w-fit px-3 py-1 rounded-full border border-primary/10 shadow-inner">
             <div className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
             {t("Nova Operação", "Nova Operação")}
          </div>
          <h1 className="text-4xl xs:text-5xl font-black tracking-tighter leading-tight text-foreground">
             {t("Roteiro", "Roteiro")} <span className="text-brand-gradient">{t("Inteligente", "Inteligente")}</span>
          </h1>
          <p className="text-muted-foreground font-medium text-sm xs:text-base max-w-xl leading-relaxed opacity-80">
             {t("Importe sua planilha e deixe nossa IA organizar suas rotas da Shopee em segundos.", "Importe sua planilha e deixe nossa IA organizar suas rotas da Shopee em segundos.")}
          </p>
        </motion.div>
        
        <div className="absolute top-0 right-1/4 h-64 w-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column - Interaction */}
        <div className="lg:col-span-7 space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8 }}
          >
            <DropzoneArea 
              onFileSelect={handleFileSelect}
              isParsing={isParsing}
              fileSelected={!!file}
              parseProgress={parseProgress}
            />
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
             {[
               { icon: ShieldCheck, title: "Proteção de Dados", desc: "Processamento seguro com criptografia militar.", color: "blue" },
               { icon: Star, title: "IA de Roteirização", desc: "Algoritmos de última geração para menor KM.", color: "amber" }
             ].map((item, idx) => (
               <motion.div 
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1, duration: 0.6 }}
                className="p-5 xs:p-6 rounded-2xl bg-card/40 backdrop-blur-xl border border-border/10 flex gap-4 xs:gap-5 items-start shadow-xl shadow-black/5 group hover:bg-card/60 transition-all duration-500"
               >
                  <div className={cn(
                    "p-4 rounded-2xl shrink-0 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500",
                    item.color === "blue" ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                     <item.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-base tracking-tight">{item.title}</h4>
                    <p className="text-[13px] text-muted-foreground font-medium leading-relaxed opacity-70">{item.desc}</p>
                  </div>
               </motion.div>
             ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-6"
          >
              <ManualDeliveryForm 
                onAdd={handleAddManualDelivery} 
                onAddBatch={handleAddBatchDeliveries}
                existingTrackingCodes={(parsed?.valid || []).map((d: any) => d.spx_tn).filter(Boolean)}
              />

              {parsed && parsed.valid.length > 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-black tracking-tight">{t("Entregas Identificadas", "Entregas Identificadas")}</h3>
                    <Badge variant="outline" className="rounded-full border-primary/20 text-primary font-black uppercase tracking-widest text-[9px]">
                      {parsed.valid.length} {t("Paradas", "Paradas")}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {parsed.valid.map((delivery, idx) => (
                      <DeliveryItem 
                        key={delivery.spx_tn || idx}
                        delivery={delivery}
                        onEdit={() => setEditingIndex(idx)}
                        onRemove={() => handleRemoveDelivery(idx)}
                      />
                    ))}
                  </div>
                </div>
              )}
          </motion.div>
        </div>

        {editingIndex !== null && (
          <EditDeliveryModal
            delivery={parsed?.valid[editingIndex]}
            isOpen={editingIndex !== null}
            onClose={() => setEditingIndex(null)}
            onSave={(updated) => {
              handleUpdateDelivery(editingIndex, updated);
              setEditingIndex(null);
            }}
          />
        )}

        {/* Right Column - Results/Summary */}
        <div className="lg:col-span-5 relative">
          <AnimatePresence mode="wait">
            {parsed ? (
              <motion.div 
                key="parsed-results"
                initial={{ opacity: 0, scale: 0.95, x: 20 }} 
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: 20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="sticky top-32"
              >
                <Card className="rounded-3xl border-none bg-brand-gradient p-6 xs:p-8 text-primary-foreground shadow-[0_40px_80px_-15px_rgba(255,140,0,0.35)] relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-10 opacity-[0.15] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000 transform">
                      <FileSpreadsheet className="h-48 w-48" />
                   </div>
                   
                   {/* Glossy overlay effect */}
                   <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                   
                   <div className="relative z-10 space-y-10">
                      <div className="space-y-4">
                         <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none font-black px-5 py-1.5 rounded-full text-[10px] uppercase tracking-[0.25em] shadow-lg">
                            {t("Arquivo Identificado", "Arquivo Identificado")}
                         </Badge>
                          <h3 className="text-3xl font-black tracking-tighter truncate max-w-full leading-tight" title={sourceLabel}>{sourceLabel}</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-10">
                         <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">{t("Válidos", "Válidos")}</div>
                            <div className="text-5xl font-black tracking-tighter">{parsed.valid.length}</div>
                         </div>
                         {parsed.invalid > 0 && (
                            <div className="space-y-1">
                              <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">{t("Erros", "Erros")}</div>
                              <div className="text-5xl font-black tracking-tighter text-white/50">{parsed.invalid}</div>
                            </div>
                         )}
                      </div>


                      <div className="space-y-5 pt-6 border-t border-white/10">
                         <Label htmlFor="freight" className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 flex items-center gap-3">
                            <DollarSign className="h-4 w-4" /> {t("Configurar Ganhos Estimados", "Configurar Ganhos Estimados")}
                         </Label>
                         <div className="relative group/input">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-white/40 group-focus-within/input:text-white/60 transition-colors">R$</span>
                            <Input
                              id="freight"
                              placeholder="0,00"
                              className="pl-14 h-16 rounded-2xl bg-white/10 border-white/20 focus-visible:ring-white/40 focus-visible:border-white/30 font-black text-2xl placeholder:text-white/20 shadow-inner transition-all"
                              value={freightValue}
                              onChange={(e) => setFreightValue(e.target.value)}
                            />
                         </div>
                      </div>

                      <Button 
                        onClick={handleCreateRoute}
                        disabled={loading || !parsed.valid.length}
                        className="w-full h-14 xs:h-16 rounded-2xl bg-white text-primary hover:bg-white/95 font-black text-base xs:text-lg shadow-2xl hover:scale-[1.02] active:scale-95 transition-all group flex items-center justify-center gap-4 border-none"
                      >
                        <span>{t("Gerar Roteiro Mágico", "Gerar Roteiro Mágico")}</span>
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                           <ArrowRight className="h-5 w-5" />
                        </div>
                      </Button>
                   </div>
                </Card>

                {parsed.warnings.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/20 flex gap-4 shadow-sm"
                  >
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                       <AlertCircle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="text-[13px] font-medium text-amber-700/80 leading-relaxed">
                      <p className="font-black mb-1.5 text-amber-700 uppercase tracking-widest text-[10px]">Diagnóstico:</p>
                      <ul className="list-disc pl-5 space-y-1.5">
                         {parsed.warnings.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}
                         {parsed.warnings.length > 3 && <li className="font-bold">E outros {parsed.warnings.length - 3} alertas detectados...</li>}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="waiting-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-10 sticky top-32"
              >
                <div className="p-12 rounded-[3rem] bg-card/40 backdrop-blur-xl border border-border/10 text-center space-y-8 shadow-2xl shadow-black/5 relative overflow-hidden group">
                   <div className="h-24 w-24 rounded-[2rem] bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground/30 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                      <FileSpreadsheet className="h-10 w-10" />
                   </div>
                   <div className="space-y-2">
                      <h4 className="font-black text-2xl tracking-tight">{t("Aguardando Dados", "Aguardando Dados")}</h4>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-[220px] mx-auto opacity-70">
                         {t("Faça o upload da planilha para liberar as ferramentas de análise.", "Faça o upload da planilha para liberar as ferramentas de análise.")}
                      </p>
                   </div>
                   
                   <div className="absolute -right-16 -top-16 h-32 w-32 bg-primary/5 rounded-full blur-3xl opacity-50" />
                </div>

                <div className="space-y-6">
                   <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 px-6">Padrão Operacional Pro</h5>
                   {[
                      { icon: Zap, label: "Velocidade Extrema", desc: "Resultados em menos de 2 segundos.", color: "orange" },
                      { icon: Sparkles, label: "Sequenciamento Inteligente", desc: "Ordem de entrega baseada em geolocalização.", color: "purple" },
                      { icon: Shield, label: "Segurança Shopee", desc: "Formatos 100% validados para relatórios SPX.", color: "green" }
                   ].map((item, idx) => (
                      <motion.div 
                        key={item.label} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + idx * 0.1 }}
                        className="flex gap-5 items-center p-5 rounded-2xl hover:bg-muted/30 transition-all duration-300 group"
                      >
                         <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                            <item.icon className="h-5 w-5" />
                         </div>
                         <div>
                            <div className="text-base font-black tracking-tight leading-none mb-1.5">{item.label}</div>
                            <div className="text-xs text-muted-foreground font-medium opacity-60">{item.desc}</div>
                         </div>
                      </motion.div>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
