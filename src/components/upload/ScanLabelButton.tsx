import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { scanLabel } from "@/lib/scan-label.functions";
import { searchAddress } from "@/lib/maptiler";
import { buildDestinationAddress, normalizeAddress } from "@/lib/viacep";
import { supabase } from "@/integrations/supabase/client";

interface ScanLabelButtonProps {
  onAdd: (delivery: any) => void;
  onAddBatch?: (deliveries: any[]) => void;
  existingTrackingCodes?: string[];
}

// Comprime e converte File em base64 (max 1280px)
async function fileToCompressedBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Falha ao carregar imagem"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export function ScanLabelButton({ onAdd, onAddBatch, existingTrackingCodes = [] }: ScanLabelButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>("");
  const scanLabelFn = useServerFn(scanLabel);

  const processFile = async (file: File): Promise<any | null> => {
    try {
      setStage(`Otimizando: ${file.name}`);
      const base64 = await fileToCompressedBase64(file);

      setStage(`Lendo IA: ${file.name}`);
      const result = await scanLabelFn({ data: { imageBase64: base64 } });

      if (!result.success) {
        toast.error(`Falha no arquivo ${file.name}`, { description: result.error });
        return null;
      }

      const { trackingCode, address, neighborhood, city, zipcode } = result;

      if (!trackingCode && !address) {
        toast.error(`Etiqueta ilegível: ${file.name}`);
        return null;
      }

      // 1) Dedup em memória
      if (trackingCode && existingTrackingCodes.includes(trackingCode)) {
        toast.warning(`Já na lista: ${trackingCode}`);
        return null;
      }

      // 2) Dedup no banco
      if (trackingCode) {
        const { data: existing } = await supabase
          .from("deliveries")
          .select("id")
          .eq("spx_tn", trackingCode)
          .limit(1)
          .maybeSingle();

        if (existing) {
          toast.warning(`Já cadastrado: ${trackingCode}`);
          return null;
        }
      }

      if (!address) {
        toast.error(`Endereço não identificado: ${file.name}`);
        return null;
      }

      // 3) Normalizar endereço via ViaCEP (corrige bairro fora de ordem, cidade/UF)
      setStage(`Normalizando CEP: ${zipcode || "—"}`);
      const normalized = await normalizeAddress({ address, neighborhood, city, zipcode });

      // 4) Geocodificar
      setStage(`Localizando: ${normalized.street || normalized.fullAddress}`);
      const geo = await searchAddress(normalized.fullAddress, {
        street: normalized.street,
        number: normalized.number,
        neighborhood: normalized.neighborhood,
        city: normalized.city,
        zipcode: normalized.zipcode
      });

      if (!geo || geo.length === 0) {
        toast.error(`Não localizado: ${normalized.fullAddress}`);
        return null;
      }

      const best = geo[0];

      // Update confidence if geocoding was approximate
      let finalConfidence = normalized.confidence;
      let finalReason = normalized.confidenceReason || "";
      
      if (best.quality === "approximate") {
        finalConfidence = finalConfidence === "high" ? "medium" : finalConfidence;
        finalReason += (finalReason ? " + " : "") + "Número não exato no mapa";
      } else if (best.quality === "zipcode") {
        finalConfidence = "low";
        finalReason += (finalReason ? " + " : "") + "Localizado apenas pelo CEP";
      }

      return {
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
      };
    } catch (e: any) {
      toast.error(`Erro ao processar ${file.name}`, { description: e?.message });
      return null;
    }
  };

  const handleFiles = async (files: FileList) => {
    setLoading(true);
    const results: any[] = [];
    const fileArray = Array.from(files);
    
    for (let i = 0; i < fileArray.length; i++) {
      setStage(`Processando ${i + 1} de ${fileArray.length}...`);
      const res = await processFile(fileArray[i]);
      if (res) {
        results.push(res);
        if (!onAddBatch) {
           onAdd(res);
        }
      }
    }

    if (onAddBatch && results.length > 0) {
      onAddBatch(results);
    }

    if (results.length > 0) {
      toast.success(`${results.length} etiquetas processadas com sucesso!`);
    }
    
    setLoading(false);
    setStage("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="w-full h-12 rounded-xl border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-black gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs truncate max-w-[200px]">{stage || "Processando..."}</span>
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            <ScanLine className="h-4 w-4" />
            Escanear Etiquetas em Massa (IA)
          </>
        )}
      </Button>
    </>
  );
}
