import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

export const deliveryService = {
  async getDeliveriesByRoute(routeId: string) {
    const { data, error } = await supabase
      .from("deliveries")
      .select("id, status, sequence, original_sequence, stop, destination_address, neighborhood, city, latitude, longitude, spx_tn, delivered_at")
      .eq("route_id", routeId)
      .order("sequence", { ascending: true, nullsFirst: false });
    if (error) {
      console.error("[deliveryService] Error fetching deliveries by route:", error);
      throw error;
    }
    return data;
  },

  async updateDeliveryStatus(id: string, status: DeliveryStatus, deliveredAt?: string) {
    const { data, error } = await supabase
      .from("deliveries")
      .update({ status, delivered_at: deliveredAt || new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateSequences(deliveryIds: string[], sequences: number[]) {
    const { error } = await supabase.rpc("update_deliveries_sequence", {
      delivery_ids: deliveryIds,
      sequences: sequences,
    });
    if (error) throw error;
  },

  async insertBatch(deliveries: any[]) {
    const { error } = await supabase.from("deliveries").insert(deliveries);
    if (error) throw error;
  },

  async markAllAsDelivered(routeId: string) {
    const { error } = await supabase
      .from("deliveries")
      .update({ 
        status: 'delivered', 
        delivered_at: new Date().toISOString() 
      })
      .eq("route_id", routeId)
      .neq("status", "delivered");
    if (error) throw error;
  }
};
