import { supabase } from "@/integrations/supabase/client";

export const companyService = {
  async createCompany(name: string, ownerUserId: string) {
    const { data, error } = await supabase
      .from("companies")
      .insert({ name, owner_user_id: ownerUserId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getCompanyByOwner(userId: string) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
};
