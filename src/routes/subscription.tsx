import { createFileRoute, useSearch } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Zap, Shield, Crown, CreditCard, Rocket, Star, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { isAfter, parseISO, startOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleApiError, invokeFunction } from "@/utils/error-handler";

export const Route = createFileRoute("/subscription")({ 
  component: () => <AppShell><Subscription /></AppShell>,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      success: search.success === "true",
      canceled: search.canceled === "true",
    };
  },
});

function Subscription() {
  const auth = useAuth();
  const { success, canceled } = useSearch({ from: "/subscription" });
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (success) {
      toast.success("Pagamento realizado com sucesso! Seu plano será atualizado em instantes.");
    }
    if (canceled) {
      toast.error("O pagamento foi cancelado.");
    }
  }, [success, canceled]);
  
  const isExpired = useMemo(() => {
    if (!auth.expiresAt) return false;
    const expiryDate = startOfDay(parseISO(auth.expiresAt));
    const today = startOfDay(new Date());
    return isAfter(today, expiryDate) || !auth.isActive;
  }, [auth.expiresAt, auth.isActive]);

  const expiryText = (auth.expiresAt && !isNaN(parseISO(auth.expiresAt).getTime()))
    ? format(parseISO(auth.expiresAt), "dd 'de' MMMM", { locale: ptBR })
    : "";

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(true);
      const { data, error } = await invokeFunction(supabase, "create-checkout", {
        body: { priceId },
      });
 
      if (error) return;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Não foi possível gerar o link de pagamento.");
      }
    } catch (error: any) {
      handleApiError(error, {
        title: "Erro no Checkout",
        description: "Não conseguimos iniciar o processo de pagamento. Tente novamente."
      });
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      name: "Profissional",
      price: "R$ 20,00",
      priceId: "pro_monthly",
      description: "Otimização ilimitada para motoristas de elite.",
      icon: Rocket,
      color: "text-primary",
      bg: "bg-primary/10",
      features: [
        "Entregas ilimitadas", 
        "Algoritmo avançado", 
        "Suporte prioritário", 
        "Histórico completo", 
        "Multi-plataforma",
        "Acesso vitalício ao suporte"
      ],
      popular: true,
      current: true
    }
  ];

  return (
    <div className="space-y-10 xs:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32 lg:pb-20">
      {isExpired && (
        <Card className="border-destructive/50 bg-destructive/5 overflow-hidden rounded-[2rem]">
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-black tracking-tight text-destructive mb-1">Seu acesso expirou</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                Seu período de teste terminou em <span className="font-bold text-foreground">{expiryText}</span>. 
                Assine agora para continuar otimizando suas rotas sem interrupções.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4 px-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-2xl border border-primary/20">
           <Star className="h-4 w-4 fill-current" />
           <span className="text-xs font-black uppercase tracking-widest">Planos e Preços</span>
        </div>
        <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter">O plano para quem vive de <span className="text-primary">entregas</span>.</h1>
        <p className="text-muted-foreground font-medium text-sm xs:text-base md:text-lg leading-relaxed">
           Menos tempo no trânsito, mais dinheiro no bolso. Assine a ferramenta que escala seus ganhos.
        </p>
      </div>

      <div className="grid grid-cols-1 max-w-sm mx-auto px-6 xs:px-4">
        {plans.map((plan) => (
          <Card key={plan.name} className={cn(
            "rounded-[2rem] xs:rounded-[3rem] border-2 transition-all duration-500 relative flex flex-col group h-full",
            plan.popular ? "border-primary shadow-2xl shadow-primary/10 scale-105 z-10 bg-card" : "border-border/40 hover:border-primary/30 bg-card/50"
          )}>
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-gradient text-primary-foreground text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full shadow-lg shadow-primary/20">
                 Mais Popular
              </div>
            )}
            
            <CardHeader className="p-6 xs:p-8 pb-4 text-center">
              <div className={cn("h-16 w-16 rounded-[2rem] mx-auto flex items-center justify-center mb-6 transition-transform group-hover:scale-110", plan.bg)}>
                 <plan.icon className={cn("h-8 w-8", plan.color)} />
              </div>
              <CardTitle className="text-2xl font-black tracking-tight mb-2">{plan.name}</CardTitle>
              <div className="text-4xl font-black tracking-tighter mb-2">{plan.price}</div>
              <p className="text-sm font-medium text-muted-foreground">{plan.description}</p>
            </CardHeader>

            <CardContent className="p-6 xs:p-8 flex-1 flex flex-col">
              <div className="space-y-4 mb-10 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm font-semibold">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                       <Check className="h-3 w-3" />
                    </div>
                    {feature}
                  </div>
                ))}
              </div>

              <Button 
                variant={plan.popular ? "default" : "outline"} 
                disabled={loading}
                onClick={() => handleSubscribe(plan.priceId)}
                className={cn(
                  "w-full h-14 rounded-2xl font-black text-base shadow-xl transition-all active:scale-95",
                  plan.popular ? "bg-brand-gradient shadow-primary/20" : "rounded-2xl border-primary text-primary hover:bg-primary/5"
                )}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Ativar Plano Pro"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap justify-center gap-6 xs:gap-12 pt-10 opacity-50 grayscale hover:grayscale-0 transition-all duration-700 px-4">
         <div className="flex items-center gap-2 font-bold text-sm">
            <Shield className="h-5 w-5" /> Pagamento Seguro
         </div>
         <div className="flex items-center gap-2 font-bold text-sm">
            <CreditCard className="h-5 w-5" /> Cancele a qualquer momento
         </div>
      </div>
    </div>
  );
}
