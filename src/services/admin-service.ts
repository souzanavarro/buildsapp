import { supabase } from "@/integrations/supabase/client";

export const adminService = {
  async getGlobalStats(formattedRange: { from: string; to: string } | null) {
    const usersPromise = supabase.from("profiles").select("*", { count: "exact", head: true });
    const subsPromise = supabase.from("subscriptions").select("status, price");
    const problemPromise = supabase.from("deliveries").select("id, latitude, longitude, status").eq("status", "problem");
    
    let routesPromise;
    let deliveriesPromise;

    if (formattedRange?.from && formattedRange?.to) {
      routesPromise = supabase.from("routes")
        .select("*", { count: "exact", head: true })
        .gte("route_date", formattedRange.from)
        .lte("route_date", formattedRange.to);
      
      deliveriesPromise = supabase.from("deliveries")
        .select("id, routes!inner(route_date)", { count: "exact", head: true })
        .gte("routes.route_date", formattedRange.from)
        .lte("routes.route_date", formattedRange.to);
    } else {
      routesPromise = supabase.from("routes").select("*", { count: "exact", head: true });
      deliveriesPromise = supabase.from("deliveries").select("*", { count: "exact", head: true });
    }

    const [usersRes, subsRes, routesRes, deliveriesRes, problemRes] = await Promise.all([
      usersPromise,
      subsPromise,
      routesPromise,
      deliveriesPromise,
      problemPromise,
    ]);

    if (usersRes.error) throw usersRes.error;

    const active = (subsRes.data ?? []).filter((s) => s.status === "active");
    const mrr = active.reduce((sum, s) => sum + Number(s.price), 0);
    
    return {
      users: usersRes.count ?? 0,
      activeSubs: active.length,
      overdue: (subsRes.data ?? []).filter((s) => s.status === "overdue").length,
      mrr,
      routes: routesRes.count ?? 0,
      deliveries: deliveriesRes.count ?? 0,
      problemCount: problemRes.data?.length ?? 0,
      problems: problemRes.data ?? [],
    };
  },

  async listUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data ?? [];
  },

  async updateUserStatus(userId: string, active: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ active })
      .eq("id", userId);
    if (error) throw error;
  },

  async updateUserRole(userId: string, role: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);
    
    if (error) throw error;
    
    // Also update user_roles table to keep it in sync for RLS
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: role as any }, { onConflict: 'user_id' });
      
    if (roleError) console.error("Error updating user_role:", roleError);
  },


  async renewUserPlan(userId: string, currentExpiry: string | null) {
    const baseDate = currentExpiry ? new Date(currentExpiry) : new Date();
    const startDate = baseDate < new Date() ? new Date() : baseDate;
    const newExpiry = new Date(startDate);
    newExpiry.setDate(newExpiry.getDate() + 30);
    
    const { error } = await supabase
      .from("profiles")
      .update({ 
        expires_at: newExpiry.toISOString().split('T')[0],
        active: true
      })
      .eq("id", userId);
    if (error) throw error;
  },

  async getMaintenanceData() {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, role, maintenance_alert_interval_km, last_maintenance_odometer")
      .or("role.eq.driver,role.eq.subscriber");

    if (error) throw error;

    const driversWithAlerts = await Promise.all((profiles || []).map(async (p) => {
      const { data: routes } = await supabase
        .from("routes")
        .select("total_distance")
        .eq("driver_id", p.user_id)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const totalKmRecent = (routes || []).reduce((sum, r) => sum + Number(r.total_distance || 0), 0);
      
      const currentOdometer = Number(p.last_maintenance_odometer || 0) + totalKmRecent;
      const kmSinceLast = currentOdometer - Number(p.last_maintenance_odometer || 0);
      const threshold = p.maintenance_alert_interval_km || 10000;
      const isAlert = kmSinceLast >= threshold;
      const progress = (kmSinceLast / threshold) * 100;

      return {
        user_id: p.user_id as string,
        full_name: p.full_name as string,
        last_maintenance_odometer: p.last_maintenance_odometer as number,
        maintenance_alert_interval_km: threshold,
        currentOdometer,
        kmSinceLast,
        isAlert,
        progress: Math.min(progress, 100),
      };
    }));

    return driversWithAlerts;
  }
};
