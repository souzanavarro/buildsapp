import { supabase } from "@/integrations/supabase/client";

export const routeService = {
  async getDashboardStats(
    dateFrom: string,
    dateTo: string,
    driverId?: string | null,
    forceSelf?: boolean,
  ) {
    const { data, error } = await supabase.rpc("get_dashboard_stats", {
      p_date_from: dateFrom,
      p_date_to: dateTo,
      ...(driverId ? { p_driver_id: driverId } : {}),
      ...(forceSelf ? { p_force_self: true } : {}),
    } as any);
    if (error) {
      console.error("[routeService] Error fetching dashboard stats:", error);
      throw error;
    }
    return data as {
      routes: any[];
      total: number;
      byStatus: Record<string, number>;
      totalFreight: number;
      estimatedDistanceKm?: number;
      estimatedFuelCost?: number;
      tollsCost?: number;
      netProfit?: number;
      isAdmin?: boolean;
      isAdminRole?: boolean;
      viewMode?: "admin" | "subscriber";
    };
  },

  async listDrivers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .neq("role", "admin")
      .order("full_name", { ascending: true });
    if (error) {
      console.error("[routeService] Error listing drivers:", error);
      throw error;
    }
    return (data ?? []).map((p) => ({
      id: p.user_id as string,
      name: (p.full_name as string) || (p.email as string) || "Sem nome",
    }));
  },

  async getRoutes(
    dateFrom?: string,
    dateTo?: string,
    opts?: { userId?: string | null; isAdmin?: boolean },
  ) {
    let query = supabase
      .from("routes")
      .select("id, name, status, route_date, total_deliveries, freight_value")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (dateFrom && dateTo) {
      query = query.gte("route_date", dateFrom).lte("route_date", dateTo);
    }

    // Non-admins only see their own routes (created or assigned as driver)
    if (opts?.userId && !opts.isAdmin) {
      query = query.or(`user_id.eq.${opts.userId},driver_id.eq.${opts.userId}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[routeService] Error fetching routes:", error);
      throw error;
    }
    return data;
  },


  async getRouteById(id: string) {
    const { data, error } = await supabase
      .from("routes")
      .select(
        "id, name, status, route_date, total_deliveries, freight_value, total_distance, tolls_value, company_id, driver_id, created_at",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) {
      console.error("[routeService] Error fetching route by ID:", error);
      throw error;
    }
    return data;
  },


  async updateRoute(id: string, payload: any) {
    const { data, error } = await supabase
      .from("routes")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteRoute(id: string, _reason?: string) {
    const { data: existingRoute, error: lookupError } = await supabase
      .from("routes")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!existingRoute) return { success: true, alreadyDeleted: true };

    const { data: deletedRoutes, error: deleteError } = await supabase
      .from("routes")
      .delete()
      .eq("id", id)
      .select("id");

    if (!deleteError && deletedRoutes && deletedRoutes.length > 0) {
      return { success: true, mode: "hard" };
    }

    const deletedAt = new Date().toISOString();
    const { data: softDeletedRoute, error: softDeleteError } = await supabase
      .from("routes")
      .update({ deleted_at: deletedAt })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (softDeleteError) {
      throw deleteError || softDeleteError;
    }

    if (!softDeletedRoute) {
      throw deleteError || new Error("Roteiro nao encontrado ou sem permissao para excluir.");
    }

    return { success: true, mode: "soft" };
  },

  async createRoute(payload: any) {
    const { data, error } = await supabase.from("routes").insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async createRouteWithDeliveries(payload: {
    name: string;
    source_file_name: string;
    company_id: string;
    user_id: string;
    driver_id: string;
    route_date?: string;
    total_deliveries: number;
    freight_value: number;
    deliveries: any[];
    total_rows?: number;
    invalid_rows?: number;
  }) {
    const { data, error } = await supabase.rpc("create_route_with_deliveries", {
      p_name: payload.name,
      p_source_file_name: payload.source_file_name,
      p_company_id: payload.company_id,
      p_user_id: payload.user_id,
      p_driver_id: payload.driver_id,
      p_route_date: payload.route_date,
      p_total_deliveries: payload.total_deliveries,
      p_freight_value: payload.freight_value,
      p_deliveries: payload.deliveries,
      p_total_rows: payload.total_rows || 0,
      p_invalid_rows: payload.invalid_rows || 0,
    });
    if (error) {
      console.error("[routeService] Error in createRouteWithDeliveries:", error);
      throw error;
    }
    return data;
  },
};
