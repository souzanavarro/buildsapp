import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTelemetryAnalytics(userId?: string, range?: { from: string; to: string }) {
  return useQuery({
    queryKey: ["telemetry-analytics", userId, range],
    queryFn: async () => {
      if (!userId) return null;
      
      let query = supabase
        .from("driver_telemetry")
        .select("*")
        .eq("user_id", userId);
        
      if (range) {
        query = query.gte("created_at", range.from).lte("created_at", range.to);
      }
      
      const { data, error } = await query.order("created_at", { ascending: true });
      
      if (error) throw error;
      if (!data || data.length < 2) return { harshEvents: 0, idleTimeMinutes: 0, data };
      
      let harshEvents = 0;
      let idleTimeMs = 0;
      
      for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1];
        const curr = data[i];
        
        const timeDiff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
        const speed = curr.speed ?? 0;
        
        if (speed < 1 && timeDiff > 0 && timeDiff < 10 * 60 * 1000) {
          idleTimeMs += timeDiff;
        }
        
        const speedDiff = (prev.speed ?? 0) - speed;
        if (speedDiff > 15 && timeDiff < 30000) {
          harshEvents++;
        }
      }
      
      return {
        harshEvents,
        idleTimeMinutes: Math.round(idleTimeMs / 60000),
        data: (data as any[])
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
