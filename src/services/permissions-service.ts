import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/hooks/use-auth";

export const permissionsService = {
  async getRolePermissions() {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("*");
    
    if (error) throw error;
    return data;
  },

  async updateRolePermission(role: AppRole, permission: string, enabled: boolean) {
    if (enabled) {
      const { error } = await supabase
        .from("role_permissions")
        .insert({ role, permission_text: permission });
      
      if (error && error.code !== '23505') throw error; // Ignore duplicate key
    } else {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role", role)
        .eq("permission_text", permission);
      
      if (error) throw error;
    }
  }
};
