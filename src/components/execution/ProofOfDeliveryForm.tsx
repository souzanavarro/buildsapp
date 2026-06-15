import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MobileIcon as Camera, XIcon as X, CheckIcon as Check, Loader2, PlusIcon as Plus, AlertTriangleIcon as AlertTriangle } from "@/components/ui/icons";
import { supabase } from "@/integrations/supabase/client";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { haversineKm } from "@/lib/geo";

const compressImage = (file: File, maxWidth = 1024, quality = 0.7): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error("Canvas to Blob failed"));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

interface ProofOfDeliveryFormProps {
  deliveryId?: string;
  deliveryIds?: string[];
  expectedSpxTn?: string;
  onComplete: () => void;
  onCancel: () => void;
}

const MAX_PHOTOS = 3;

const NOTE_CATEGORIES = [
  "Endereço com difícil acesso",
  "Cliente com muitas reclamações de PNR",
  "Atenção - cuidado redobrado",
  "Endereço incorreto / desatualizado",
  "Cliente ausente frequentemente",
];

function normalizeAddress(addr?: string | null): string {
  if (!addr) return "";
  return addr
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const ProofOfDeliveryForm = ({ deliveryId, deliveryIds, onComplete, onCancel }: ProofOfDeliveryFormProps) => {
  const ids = deliveryIds || (deliveryId ? [deliveryId] : []);
  const primaryId = ids[0];
  const { t } = useTranslation();
  const { addToQueue } = useSyncQueue();
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number, longitude: number } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.warn("Location error for POD validation:", err)
      );
    }
  }, []);

  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryNote, setCategoryNote] = useState("");
  const [delivery, setDelivery] = useState<{ destination_address: string | null; neighborhood: string | null; city: string | null; latitude: number | null; longitude: number | null } | null>(null);
  const [existingNotes, setExistingNotes] = useState<Array<{ id: string; category: string; note: string | null; created_at: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!primaryId) return;
      const { data: d } = await supabase
        .from('deliveries')
        .select('destination_address, neighborhood, city, latitude, longitude')
        .eq('id', primaryId)
        .maybeSingle();
      if (cancelled || !d) return;
      setDelivery(d as any);
      const key = normalizeAddress(d.destination_address);
      if (key) {
        const { data: notesData } = await supabase
          .from('customer_notes')
          .select('id, category, note, created_at')
          .eq('address_key', key)
          .order('created_at', { ascending: false })
          .limit(10);
        if (!cancelled && notesData) setExistingNotes(notesData);
      }
    })();
    return () => { cancelled = true; };
  }, [deliveryId]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).slice(0, MAX_PHOTOS - photos.length);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, { file, preview: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    // 1. Distance validation
    if (currentLocation && delivery?.destination_address && delivery.latitude && delivery.longitude) {
      const dist = haversineKm(
        { lat: currentLocation.latitude, lng: currentLocation.longitude },
        { lat: Number(delivery.latitude), lng: Number(delivery.longitude) }
      );
      
      if (dist > 0.2) { // 200 meters
        const confirmLocation = window.confirm(
          `⚠️ Atenção: Você está a ${Math.round(dist * 1000)}m de distância do endereço de entrega. Deseja continuar mesmo assim?`
        );
        if (!confirmLocation) return;
      }
    }

    setLoading(false); // Reset in case it was set elsewhere
    setLoading(true);
    
    try {
      // Compress photos before processing
      const processedPhotos = await Promise.all(
        photos.map(async (p) => {
          try {
            const compressed = await compressImage(p.file);
            return { ...p, file: compressed };
          } catch (e) {
            console.error("Compression failed, using original:", e);
            return p;
          }
        })
      );

      if (!navigator.onLine) {
         // Offline logic: queue everything for each ID
         for (const dId of ids) {
           for (const { file } of processedPhotos) {
              const base64 = await fileToBase64(file);
              await addToQueue({
                type: "photo_upload",
                payload: {
                  deliveryId: dId,
                  base64,
                  fileName: file.name,
                  receiverName: "Baixa via App (Offline)"
                }
              });
           }
  
           await addToQueue({
             type: "delivery_update",
             payload: {
               id: dId,
               status: 'delivered',
               delivered_at: new Date().toISOString()
             }
           });
         }

         toast.success(t("Salvo offline! Sincronizará automaticamente quando houver sinal.", "Salvo offline! Sincronizará automaticamente quando houver sinal."));
         onComplete();
         return;
      }

      const uploadPromises = processedPhotos.map(async ({ file }) => {
        const fileExt = 'jpg';
        const fileName = `${primaryId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('delivery-proofs')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('delivery-proofs').getPublicUrl(fileName);
        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // Create POD records for all IDs
      const allPodRecords: any[] = [];
      for (const dId of ids) {
        if (uploadedUrls.length === 0) {
          allPodRecords.push({
            delivery_id: dId,
            photo_url: null,
            notes: notes || null,
            receiver_name: "Baixa via App",
          });
        } else {
          uploadedUrls.forEach((url, idx) => {
            allPodRecords.push({
              delivery_id: dId,
              photo_url: url,
              notes: idx === 0 ? (notes || null) : null,
              receiver_name: "Baixa via App",
            });
          });
        }
      }
      
      const { error: podError } = await supabase.from('proof_of_delivery').insert(allPodRecords);
      if (podError) throw podError;

      // Save customer notes (shared across drivers)
      if (selectedCategories.length > 0 && delivery?.destination_address) {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (uid) {
          const key = normalizeAddress(delivery.destination_address);
          const rows = selectedCategories.map(cat => ({
            delivery_id: primaryId,
            destination_address: delivery.destination_address!,
            address_key: key,
            neighborhood: delivery.neighborhood,
            city: delivery.city,
            category: cat,
            note: categoryNote || null,
            created_by: uid,
          }));
          const { error: noteErr } = await supabase.from('customer_notes').insert(rows);
          if (noteErr) console.error('[customer_notes]', noteErr);
        }
      }

      const { error: deliveryError } = await supabase
        .from('deliveries')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .in('id', ids);
      if (deliveryError) throw deliveryError;

      toast.success(t("Entrega confirmada!", "Entrega confirmada!"));
      onComplete();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao confirmar entrega: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 max-w-lg mx-auto overflow-y-auto pb-8">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
          <Check className="h-5 w-5 text-emerald-500" />
          {t("Finalizar Entrega", "Finalizar Entrega")}
        </h3>
        <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Previous notes for this address */}
      {existingNotes.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
            ⚠️ {t("Ressalvas anteriores neste endereço", "Ressalvas anteriores neste endereço")} ({existingNotes.length})
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {existingNotes.map(n => (
              <div key={n.id} className="text-xs">
                <span className="font-bold">• {n.category}</span>
                {n.note && <span className="text-muted-foreground"> — {n.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase text-muted-foreground">
            {t("Fotos de Comprovação (Opcional)", "Fotos de Comprovação (Opcional)")}
          </div>
          <div className="text-[10px] font-bold text-muted-foreground">{photos.length}/{MAX_PHOTOS}</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border/40 shadow-sm group">
              <img src={p.preview} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md opacity-90 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-black px-1.5 py-0.5 rounded">{idx + 1}</div>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 cursor-pointer bg-primary/5 hover:bg-primary/10 transition-all">
              {photos.length === 0 ? (
                <>
                  <Camera className="h-6 w-6 text-primary mb-1" />
                  <span className="text-[9px] font-black text-primary/70 text-center px-1">{t("TIRAR FOTO", "TIRAR FOTO")}</span>
                </>
              ) : (
                <>
                  <Plus className="h-6 w-6 text-primary mb-1" />
                  <span className="text-[9px] font-black text-primary/70">{t("ADICIONAR", "ADICIONAR")}</span>
                </>
              )}
              <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoChange} />
            </label>
          )}
        </div>
      </div>

      {/* Observation Section */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase text-muted-foreground">{t("Observação (Opcional)", "Observação (Opcional)")}</div>
        <Textarea
          placeholder={t("Ex: Deixado com vizinho, portaria, etc...", "Ex: Deixado com vizinho, portaria, etc...")}
          className="rounded-2xl bg-muted/30 border-none min-h-[80px] focus-visible:ring-primary/20 p-4"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Customer Notes (shared) */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase text-muted-foreground">
          {t("Observação de Entregas (compartilhada com outros motoristas)", "Observação de Entregas (compartilhada com outros motoristas)")}
        </div>
        <div className="flex flex-wrap gap-2">
          {NOTE_CATEGORIES.map(cat => {
            const active = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`text-[11px] font-bold px-3 py-2 rounded-xl border transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-muted/30 text-muted-foreground border-border/40 hover:border-primary/40"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
        {selectedCategories.length > 0 && (
          <Textarea
            placeholder={t("Detalhe adicional (opcional)...", "Detalhe adicional (opcional)...")}
            className="rounded-2xl bg-muted/30 border-none min-h-[60px] focus-visible:ring-primary/20 p-4"
            value={categoryNote}
            onChange={(e) => setCategoryNote(e.target.value)}
          />
        )}
      </div>

      <div className="pt-4 flex gap-3">
        <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black uppercase text-xs" onClick={onCancel} disabled={loading}>
          {t("Voltar", "Voltar")}
        </Button>
        <Button
          className="flex-[2] h-14 rounded-2xl font-black uppercase text-xs bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 text-white"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (<><Check className="h-5 w-5 mr-2" />{t("CONCLUIR ENTREGA", "CONCLUIR ENTREGA")}</>)}
        </Button>
      </div>
    </div>
  );
};
