import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { UploadIcon as Upload, Loader2 } from "@/components/ui/icons";


import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface DropzoneAreaProps {
  onFileSelect: (file: File) => void;
  isParsing: boolean;
  fileSelected: boolean;
  parseProgress?: number;
}

function parseStageLabel(p: number, t: any) {
  if (p < 15) return t("Abrindo arquivo...", "Abrindo arquivo...");
  if (p < 45) return t("Lendo planilha...", "Lendo planilha...");
  if (p < 75) return t("Validando entregas...", "Validando entregas...");
  if (p < 100) return t("Conferindo coordenadas...", "Conferindo coordenadas...");
  return t("Pronto!", "Pronto!");
}


export function DropzoneArea({ onFileSelect, isParsing, fileSelected, parseProgress = 0 }: DropzoneAreaProps) {
  const { t } = useTranslation();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({

    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx", ".xls"] },
    maxFiles: 1,
    onDrop: (files) => {
      const f = files[0];
      if (f) onFileSelect(f);
    },
    disabled: isParsing,
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
    >
      <div className={cn(
        "relative overflow-hidden border-2 border-dashed rounded-3xl transition-all duration-500 group shadow-sm",
        isDragActive ? "border-primary bg-primary/5 scale-[1.01] shadow-2xl shadow-primary/10" : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
      )}>
        <div {...getRootProps()} className="p-8 xs:p-16 text-center cursor-pointer flex flex-col items-center">
          <input {...getInputProps()} />
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={cn(
              "h-16 w-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 shadow-2xl",
              isDragActive ? "bg-primary text-primary-foreground shadow-primary/30" : "bg-card text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            )}
          >
            {isParsing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Upload className="h-8 w-8" />
            )}
          </motion.div>
          <h3 className="text-xl font-black mb-2 tracking-tight">
            {isParsing ? parseStageLabel(parseProgress, t) : (isDragActive ? t("Solte agora!", "Solte agora!") : t("Arraste sua planilha aqui", "Arraste sua planilha aqui"))}
          </h3>
          <p className="text-muted-foreground text-sm font-medium max-w-[320px] leading-relaxed mb-8">
            {isParsing
              ? t("Estamos analisando seu arquivo etapa por etapa.", "Estamos analisando seu arquivo etapa por etapa.")
              : <>{t("Importe o arquivo", "Importe o arquivo")} <span className="text-foreground font-bold">.xlsx</span> {t("para gerar sua rota automática.", "para gerar sua rota automática.")}</>}
          </p>


          {isParsing ? (
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                <span>{parseStageLabel(parseProgress, t)}</span>
                <span>{Math.round(parseProgress)}%</span>
              </div>
              <Progress value={parseProgress} className="h-3 rounded-full bg-primary/10" />
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              {["ID AT", "SPX TN", "Endereço", "Coordenadas"].map((tag) => (
                <Badge key={tag} variant="outline" className="bg-background border-border/40 font-bold px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {fileSelected && !isParsing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-x-0 bottom-0 h-2 bg-muted overflow-hidden"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1 }}
                className="h-full bg-brand-gradient"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
