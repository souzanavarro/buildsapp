import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { standardizeAddress } from "./address-utils";

export const normalizeAddress = standardizeAddress;

export interface CustomerNote {
  id: string;
  category: string;
  note: string | null;
  created_at: string;
  address_key: string;
}

/**
 * Fetches every customer_note whose address_key matches any of the given addresses.
 * Returns a map: address_key -> notes[]
 */
export function useCustomerNotesByAddresses(addresses: (string | null | undefined)[]) {
  const keys = useMemo(() => {
    const set = new Set<string>();
    addresses.forEach((a) => {
      const k = normalizeAddress(a);
      if (k) set.add(k);
    });
    return Array.from(set).sort();
  }, [addresses]);

  const { data } = useQuery({
    queryKey: ["customer-notes-by-keys", keys],
    queryFn: async () => {
      if (keys.length === 0) return [] as CustomerNote[];
      const { data, error } = await supabase
        .from("customer_notes")
        .select("id, category, note, created_at, address_key")
        .in("address_key", keys)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerNote[];
    },
    enabled: keys.length > 0,
    staleTime: 30_000,
  });

  return useMemo(() => {
    const map = new Map<string, CustomerNote[]>();
    (data ?? []).forEach((n) => {
      const arr = map.get(n.address_key) ?? [];
      arr.push(n);
      map.set(n.address_key, arr);
    });
    return map;
  }, [data]);
}
