import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Camera, X, CheckCircle2, AlertCircle, Scan } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { scanLabel } from "@/lib/scan-label.functions";
import { searchAddress } from "@/lib/maptiler";
import { buildDestinationAddress, normalizeAddress } from "@/lib/viacep";
import { supabase } from "@/integrations/supabase/client";

interface ContinuousScannerProps {
  onAdd: (delivery: any) => void;
  existingTrackingCodes?: string[];
}

export function ContinuousScanner({ onAdd, existingTrackingCodes = [] }: ContinuousScannerProps) {
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [processing, setProcessing] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanLabelFn = useServerFn(scanLabel);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      toast.error(t("Erro ao acessar a câmera. Verifique as permissões.", "Erro ao acessar a câmera. Verifique as permissões."));
      setIsOpen(false);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current || processing) return;

    setProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.8);

    try {
      const result = await scanLabelFn({ data: { imageBase64: base64 } });

      if (!result.success) {
        toast.error(t("Não foi possível ler esta etiqueta. Tente focar melhor.", "Não foi possível ler esta etiqueta. Tente focar melhor."));
        return;
      }

      const { trackingCode, address, neighborhood, city, zipcode } = result;

      if (!address) {
        toast.error(t("Endereço não identificado nesta captura.", "Endereço não identificado nesta captura."));
        return;
      }

      // Dedup
      if (trackingCode && existingTrackingCodes.includes(trackingCode)) {
        toast.warning(t("Esta etiqueta já foi adicionada.", "Esta etiqueta já foi adicionada."));
        return;
      }

      // Normaliza endereço via ViaCEP (corrige bairro/cidade/UF)
      const normalized = await normalizeAddress({ address, neighborhood, city, zipcode });
      
      // Cascading Search
      const geo = await searchAddress(normalized.fullAddress, {
        street: normalized.street,
        number: normalized.number,
        neighborhood: normalized.neighborhood,
        city: normalized.city,
        zipcode: normalized.zipcode
      });

      if (!geo || geo.length === 0) {
        toast.error(t("Endereço não localizado no mapa.", "Endereço não localizado no mapa."));
        return;
      }

      const best = geo[0];
      
      // Update confidence if geocoding was approximate
      let finalConfidence = normalized.confidence;
      let finalReason = normalized.confidenceReason || "";
      
      if (best.quality === "approximate") {
        finalConfidence = finalConfidence === "high" ? "medium" : finalConfidence;
        finalReason += (finalReason ? " + " : "") + t("Número não exato no mapa", "Número não exato no mapa");
      } else if (best.quality === "zipcode") {
        finalConfidence = "low";
        finalReason += (finalReason ? " + " : "") + t("Localizado apenas pelo CEP", "Localizado apenas pelo CEP");
      }

      onAdd({
        destination_address: buildDestinationAddress(normalized, best.address),
        latitude: best.lat,
        longitude: best.lng,
        neighborhood: normalized.neighborhood,
        city: normalized.city,
        zipcode: normalized.zipcode,
        status: "pending",
        spx_tn: trackingCode || "SCAN-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
        confidence: finalConfidence,
        confidence_reason: finalReason,
        package_count: 1
      });

      setCapturedCount(prev => prev + 1);
      toast.success(t("Etiqueta capturada!", "Etiqueta capturada!"));
    } catch (err) {
      toast.error(t("Erro ao processar imagem.", "Erro ao processar imagem."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Camera className="h-5 w-5" />
          {t("Abrir Scanner Contínuo (Câmera Ativa)", "Abrir Scanner Contínuo (Câmera Ativa)")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-none sm:rounded-[2rem]">
        <div className="relative aspect-[3/4] sm:aspect-video bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Overlay Mira */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
            </div>
          </div>

          {/* Header UI */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-white text-sm font-black">{capturedCount} {t("Capturadas", "Capturadas")}</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Bottom UI */}
          <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
             <div className="flex flex-col items-center text-center gap-2 max-w-[280px]">
                <p className="text-white/90 text-sm font-bold">{t("Aponte para a etiqueta e clique no botão abaixo para capturar.", "Aponte para a etiqueta e clique no botão abaixo para capturar.")}</p>
             </div>
             
             <Button
               disabled={processing}
               onClick={captureFrame}
               className="h-20 w-20 rounded-full bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/40 border-8 border-white/20 p-0 flex items-center justify-center group active:scale-90 transition-all"
             >
                {processing ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Scan className="h-8 w-8 text-white group-hover:scale-110 transition-transform" />
                )}
             </Button>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
