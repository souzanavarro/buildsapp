import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SyncAction = {
  type: "delivery_update" | "telemetry" | "photo_upload" | "maintenance";
  payload: any;
};

export function useSyncQueue() {
  const [isProcessing, setIsProcessing] = useState(false);

  const addToQueue = useCallback(async (action: SyncAction) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("sync_queue").insert({
        user_id: user.id,
        action_type: action.type,
        payload: action.payload,
        status: "pending",
      });

      if (error) throw error;
      
      toast.info("Ação salva localmente para sincronização futura.");
    } catch (err) {
      console.error("Error adding to sync queue:", err);
      // Fallback to local storage if even Supabase local fail (unlikely but safe)
      const pending = JSON.parse(localStorage.getItem("offline_sync_queue") || "[]");
      pending.push(action);
      localStorage.setItem("offline_sync_queue", JSON.stringify(pending));
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessing || !navigator.onLine) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsProcessing(false);
        return;
      }

      const { data: pendingItems, error } = await supabase
        .from("sync_queue")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error || !pendingItems?.length) {
        setIsProcessing(false);
        return;
      }

      for (const item of pendingItems) {
        try {
          const payload = item.payload as any;
          
          if (item.action_type === "delivery_update") {
             const { id, status, delivered_at } = payload;
             await supabase.from("deliveries").update({ status, delivered_at }).eq("id", id);
          } else if (item.action_type === "telemetry") {
             await supabase.from("driver_telemetry").insert(payload);
          } else if (item.action_type === "maintenance") {
             await supabase.from("maintenance_records").insert(payload);
          } else if (item.action_type === "photo_upload") {
             // Logic for handling photos queued as base64
             if (payload.base64 && payload.deliveryId) {
                const blob = await fetch(payload.base64).then(r => r.blob());
                const fileExt = payload.fileName?.split('.').pop() || 'jpg';
                const fileName = `offline_${payload.deliveryId}_${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                  .from('delivery-proofs')
                  .upload(fileName, blob);
                
                if (!uploadError) {
                   const { data: { publicUrl } } = supabase.storage.from('delivery-proofs').getPublicUrl(fileName);
                   await supabase.from('proof_of_delivery').insert({
                     delivery_id: payload.deliveryId,
                     photo_url: publicUrl,
                     receiver_name: payload.receiverName || "Offline Sync"
                   });
                }
             }
          }

          // Mark as processed
          await supabase
            .from("sync_queue")
            .update({ status: "processed", processed_at: new Date().toISOString() })
            .eq("id", item.id);
            
        } catch (itemErr: any) {
          console.error("Error processing sync item:", itemErr);
          await supabase
            .from("sync_queue")
            .update({ 
              status: "failed", 
              retry_count: item.retry_count + 1,
              last_error: itemErr.message 
            })
            .eq("id", item.id);
        }
      }

      toast.success("Dados sincronizados com sucesso!");
    } catch (err) {
      console.error("Queue processor error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  return { addToQueue, processQueue, isProcessing };
}
