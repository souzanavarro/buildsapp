import { supabase } from "@/integrations/supabase/client";
import { get, set, del, keys } from 'idb-keyval';
import { Network } from '@capacitor/network';
import { toast } from "sonner";

export type SyncAction = {
  id: string;
  type: 'delivery_update' | 'telemetry' | 'photo_upload';
  payload: any;
  userId: string;
  createdAt: string;
};

const QUEUE_KEY = 'sync_outbox_v1';

export const syncService = {
  async addToQueue(type: SyncAction['type'], payload: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const action: SyncAction = {
      id: crypto.randomUUID(),
      type,
      payload,
      userId: user.id,
      createdAt: new Date().toISOString(),
    };

    const currentQueue = await get<SyncAction[]>(QUEUE_KEY) || [];
    await set(QUEUE_KEY, [...currentQueue, action]);
    
    // Tenta processar imediatamente se houver sinal
    const status = await Network.getStatus();
    if (status.connected) {
      this.processQueue();
    } else {
      toast.info("Você está sem sinal. Ação salva para sincronização posterior.");
    }
  },

  async processQueue() {
    const queue = await get<SyncAction[]>(QUEUE_KEY) || [];
    if (queue.length === 0) return;

    const status = await Network.getStatus();
    if (!status.connected) return;

    console.log(`[SyncService] Processing ${queue.length} actions...`);
    
    const remainingActions: SyncAction[] = [];

    for (const action of queue) {
      try {
        await this.executeAction(action);
      } catch (err) {
        console.error(`[SyncService] Failed to process action ${action.id}:`, err);
        remainingActions.push(action);
      }
    }

    await set(QUEUE_KEY, remainingActions);
    if (queue.length > remainingActions.length) {
      toast.success(`${queue.length - remainingActions.length} ações sincronizadas com sucesso!`);
    }
  },

  async executeAction(action: SyncAction) {
    switch (action.type) {
      case 'delivery_update':
        const { error: dErr } = await supabase
          .from('deliveries')
          .update({ 
            status: action.payload.status, 
            delivered_at: action.payload.delivered_at 
          })
          .eq('id', action.payload.id);
        if (dErr) throw dErr;
        break;

      case 'telemetry':
        const { error: tErr } = await supabase
          .from('driver_telemetry')
          .insert({
            user_id: action.userId,
            latitude: action.payload.latitude,
            longitude: action.payload.longitude,
            speed: action.payload.speed,
            heading: action.payload.heading,
            accuracy: action.payload.accuracy,
            created_at: action.payload.timestamp,
          });
        if (tErr) throw tErr;
        break;

      case 'photo_upload':
        // Payload contains base64 image or similar
        // Implementation for storage upload goes here
        break;
    }
  }
};

// Monitor de rede
if (typeof window !== 'undefined') {
  Network.addListener('networkStatusChange', (status: any) => {
    if (status.connected) {
      syncService.processQueue();
    }
  });
}
