import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useDriverPerformance() {
  const [performance, setPerformance] = useState<{
    score: number;
    successRate: number;
    badges: any[];
  } | null>(null);

  useEffect(() => {
    async function fetchPerformance() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("total_score, badges")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: stats } = await supabase.rpc("get_dashboard_stats", {
        p_date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_date_to: new Date().toISOString(),
        p_force_self: true
      } as any);

      if (profile) {
        const total = (stats as any)?.total || 0;
        const delivered = (stats as any)?.byStatus?.delivered || 0;
        
        setPerformance({
          score: profile.total_score || 0,
          successRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
          badges: (profile.badges as any) || []
        });
      }
    }

    fetchPerformance();
  }, []);

  return performance;
}
