import { supabase } from "@/integrations/supabase/client";

export const profileService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, company_id, full_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, payload: any) {
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("user_id", userId);
    if (error) throw error;
  }
};
