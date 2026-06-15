import React, { useState, useEffect } from "react";
import { GOOGLE_MAPS_API_KEY, FALLBACK_GOOGLE_MAPS_API_KEY } from "@/lib/google-maps";
import { getMapillaryImageUrl } from "@/lib/mapillary";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreetViewImageProps {
  latitude: number;
  longitude: number;
  className?: string;
}

type LoadingStatus = "idle" | "searching-mapillary" | "checking-google" | "loading-image" | "success" | "error";

export function StreetViewImage({ latitude, longitude, className }: StreetViewImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [source, setSource] = useState<"mapillary" | "google" | null>(null);
  const [status, setStatus] = useState<LoadingStatus>("idle");
  const [useFallbackKey, setUseFallbackKey] = useState(false);

  useEffect(() => {
    if (!latitude || !longitude) return;

    let isMounted = true;

    const tryFetchImages = async () => {
      setStatus("searching-mapillary");
      setImageUrl(null);
      setSource(null);

      // 1. Tenta Mapillary
      try {
        const mUrl = await getMapillaryImageUrl(latitude, longitude);
        if (mUrl && isMounted) {
          setImageUrl(mUrl);
          setSource("mapillary");
          setStatus("loading-image");
          return;
        }
      } catch (err) {
        console.error("Mapillary failed, falling back to Google", err);
      }

      if (!isMounted) return;

      // 2. Tenta Google Metadata para garantir que existe fachada
      setStatus("checking-google");
      const googleKey = useFallbackKey && FALLBACK_GOOGLE_MAPS_API_KEY ? FALLBACK_GOOGLE_MAPS_API_KEY : GOOGLE_MAPS_API_KEY;
      
      try {
        const metadataResp = await fetch(
          `https://maps.googleapis.com/maps/api/streetview/metadata?location=${latitude},${longitude}&key=${googleKey}`
        );
        const metadata = await metadataResp.json();

        if (metadata.status === "OK" && isMounted) {
          const gUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${latitude},${longitude}&fov=90&heading=0&pitch=0&key=${googleKey}`;
          setImageUrl(gUrl);
          setSource("google");
          setStatus("loading-image");
        } else if (isMounted) {
          // Se não tem Google e falhou Mapillary, tentamos o fallback key se existir
          if (!useFallbackKey && FALLBACK_GOOGLE_MAPS_API_KEY && FALLBACK_GOOGLE_MAPS_API_KEY !== GOOGLE_MAPS_API_KEY) {
            setUseFallbackKey(true);
            // O useEffect vai rodar de novo por causa do useFallbackKey
          } else {
            setStatus("error");
          }
        }
      } catch (err) {
        console.error("Google Metadata failed", err);
        if (isMounted) setStatus("error");
      }
    };

    tryFetchImages();

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, useFallbackKey]);

  if (status === "error") {
    return (
      <div className={cn("w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/50 p-4 text-center", className)}>
        <MapPin className="h-8 w-8 mb-2 opacity-20" />
        <span className="text-[10px] font-bold uppercase tracking-tighter opacity-60">Fachada Indisponível</span>
        <span className="text-[8px] opacity-40 mt-1">Nenhuma imagem encontrada para esta localização</span>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full bg-muted overflow-hidden", className)}>
      {status !== "success" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 z-20">
          <Loader2 className="h-5 w-5 animate-spin text-primary/40 mb-2" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
            {status === "searching-mapillary" ? "Buscando Mapillary..." : 
             status === "checking-google" ? "Verificando Google..." : 
             "Carregando Imagem..."}
          </span>
        </div>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            status === "success" ? "opacity-100" : "opacity-0"
          )}
          alt="Fachada"
          onLoad={() => setStatus("success")}
          onError={() => {
            if (source === "mapillary") {
              // Se Mapillary falhou no load da imagem (raro se o metadata deu ok), tenta Google
              setSource(null);
              setImageUrl(null);
              setStatus("checking-google");
            } else {
              setStatus("error");
            }
          }}
        />
      )}

      {status === "success" && source && (
        <div className="absolute bottom-1 right-2 z-10 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
          <span className="text-[8px] font-black text-white uppercase tracking-widest">
            via {source === "mapillary" ? "Mapillary" : "Google Street View"}
          </span>
        </div>
      )}
    </div>
  );
}