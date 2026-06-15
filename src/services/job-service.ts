import { supabase } from "@/integrations/supabase/client";

export const routeJobService = {
  async enqueue(payload: {
    name: string;
    source_file_name: string;
    company_id: string;
    user_id: string;
    driver_id: string;
    total_deliveries: number;
    freight_value: number;
    deliveries: any[];
  }) {
    const { data, error } = await supabase
      .from("route_jobs" as any)
      .insert({
        name: payload.name,
        source_file_name: payload.source_file_name,
        company_id: payload.company_id,
        user_id: payload.user_id,
        driver_id: payload.driver_id,
        total_deliveries: payload.total_deliveries,
        freight_value: payload.freight_value,
        deliveries: payload.deliveries,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[jobService] enqueue error:", error);
      throw error;
    }
    return data as unknown as { id: string };
  },

  async getJobStatus(jobId: string) {
    const { data, error } = await supabase
      .from("route_jobs" as any)
      .select("status, progress, route_id, error_message")
      .eq("id", jobId)
      .maybeSingle<{
        status: string;
        progress: number;
        route_id: string | null;
        error_message: string | null;
      }>();
    if (error) throw error;
    return data;
  }
};
