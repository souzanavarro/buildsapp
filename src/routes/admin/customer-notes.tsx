import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrashIcon, MapPinIcon } from "@/components/ui/icons";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

export const Route = createFileRoute("/admin/customer-notes")({
  component: () => <AppShell><CustomerNotesPage /></AppShell>,
});

interface CustomerNote {
  id: string;
  destination_address: string;
  address_key: string;
  neighborhood: string | null;
  city: string | null;
  category: string;
  note: string | null;
  created_by: string;
  created_at: string;
}

function CustomerNotesPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customer-notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_notes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerNote[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ressalva removida");
      qc.invalidateQueries({ queryKey: ["admin-customer-notes"] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { address: string; neighborhood: string | null; city: string | null; notes: CustomerNote[] }>();
    (data ?? []).forEach(n => {
      const g = map.get(n.address_key) ?? { address: n.destination_address, neighborhood: n.neighborhood, city: n.city, notes: [] };
      g.notes.push(n);
      map.set(n.address_key, g);
    });
    return Array.from(map.values()).sort((a, b) => b.notes.length - a.notes.length);
  }, [data]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Entregas Clientes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ressalvas registradas pelos motoristas, agrupadas por endereço. Visíveis para todos os motoristas.
        </p>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}

      {!isLoading && grouped.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma ressalva registrada ainda.
        </Card>
      )}

      <div className="space-y-4">
        {grouped.map((g) => (
          <Card key={g.address} className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <MapPinIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm">{g.address}</div>
                <div className="text-xs text-muted-foreground">
                  {[g.neighborhood, g.city].filter(Boolean).join(" • ") || "Sem bairro/cidade"}
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 rounded-full">
                {g.notes.length} {g.notes.length === 1 ? "ressalva" : "ressalvas"}
              </span>
            </div>

            <div className="space-y-2 pl-2 border-l-2 border-primary/20 ml-4">
              {g.notes.map((n) => (
                <div key={n.id} className="flex items-start gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold">{n.category}</div>
                    {n.note && <div className="text-xs text-muted-foreground mt-0.5">{n.note}</div>}
                    <div className="text-[10px] text-muted-foreground/70 mt-1">
                      {format(parseISO(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 h-8 w-8"
                    onClick={() => {
                      if (confirm("Remover esta ressalva?")) deleteMutation.mutate(n.id);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
