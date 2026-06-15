import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const deleteInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
});

/**
 * Perform a clean hard delete of a route and all its related data.
 * This is a server function that uses supabaseAdmin to bypass RLS and 
 * ensure all dependent data is cleaned up correctly.
 */
export const hardDeleteRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => {
    const payload = input?.data || input;
    return deleteInputSchema.parse(payload);
  })
  .handler(async ({ data, context }) => {
    const { id, reason } = data;
    const userId = context.userId;
    
    console.log(`[ServerFn] Solicitando exclusão do roteiro: ${id} por usuário: ${userId}`);

    // Fetch route info before deletion for logging and verification
    const { data: route, error: fetchError } = await supabaseAdmin
      .from("routes")
      .select("name, company_id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !route) {
      console.error("[ServerFn] Roteiro não encontrado para exclusão:", fetchError);
      throw new Error("Roteiro não encontrado.");
    }

    // Security check: Only the owner or an admin (if we had roles) should delete
    // Since we're in a server function with admin client, we manually check ownership
    if (route.user_id !== userId) {
      console.warn(`[ServerFn] Usuário ${userId} tentou excluir roteiro de ${route.user_id}`);
      throw new Error("Você não tem permissão para excluir este roteiro.");
    }

    const logEntry = {
      route_id: id,
      user_id: userId,
      route_name: route.name,
      company_id: route.company_id,
      reason: reason || "Exclusão manual",
      status: "pending"
    };

    try {
      // 1. Unlink any jobs
      await supabaseAdmin
        .from("route_jobs")
        .delete()
        .eq("route_id", id);

      // 2. Remove uploads
      await supabaseAdmin
        .from("route_uploads")
        .delete()
        .eq("route_id", id);

      // 3. Remove events
      // Find delivery IDs first
      const { data: deliveries } = await supabaseAdmin
        .from("deliveries")
        .select("id")
        .eq("route_id", id);
      
      if (deliveries && deliveries.length > 0) {
        const deliveryIds = deliveries.map(d => d.id);
        
        // Delete proof of delivery
        await supabaseAdmin
          .from("proof_of_delivery")
          .delete()
          .in("delivery_id", deliveryIds);

        // Delete delivery events
        await supabaseAdmin
          .from("delivery_events")
          .delete()
          .in("delivery_id", deliveryIds);
      }

      // 4. Remove deliveries
      await supabaseAdmin
        .from("deliveries")
        .delete()
        .eq("route_id", id);

      // 5. Finally, the route
      const { error: routeErr } = await supabaseAdmin
        .from("routes")
        .delete()
        .eq("id", id);
        
      if (routeErr) {
        console.error("[ServerFn] Erro ao deletar roteiro da tabela routes:", routeErr);
        throw new Error(`Erro ao remover roteiro: ${routeErr.message}`);
      }

      // Log success
      await supabaseAdmin.from("route_deletion_logs").insert({
        ...logEntry,
        status: "success"
      });

      console.log(`[ServerFn] Roteiro ${id} excluído com sucesso.`);
      return { success: true };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.error(`[ServerFn] Falha crítica ao excluir roteiro ${id}:`, errorMsg);
      
      // Log failure
      await supabaseAdmin.from("route_deletion_logs").insert({
        ...logEntry,
        status: "failed",
        error_details: errorMsg
      });

      throw err;
    }
  });