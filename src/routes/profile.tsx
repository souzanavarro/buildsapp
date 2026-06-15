import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { ProfileIcon, SettingsIcon, LogOutIcon, CreditCardIcon, AlertTriangleIcon as BellIcon } from "@/components/ui/icons";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { translateRole } from "@/lib/roles";


export const Route = createFileRoute("/profile")({
  component: () => (
    <AppShell transitionType="zoom">
      <ProfilePage />
    </AppShell>
  ),
});

function ProfilePage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-32 lg:pb-16">
      <div className="space-y-2">
        <h1 className="text-3xl xs:text-5xl font-black tracking-tighter leading-tight text-foreground mb-4">
          Meu <span className="text-brand-gradient">Perfil</span>
        </h1>
        <p className="text-muted-foreground font-medium text-sm xs:text-base max-w-xl leading-relaxed opacity-80">
          Gerencie suas informações pessoais, preferências e configurações de conta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 rounded-[2.5rem] border-border/10 bg-card/30 backdrop-blur-xl overflow-hidden h-fit">
          <CardContent className="pt-10 pb-8 flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <Avatar className="h-32 w-32 ring-4 ring-primary/20 ring-offset-4 ring-offset-background">
                <AvatarImage src={auth.user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-brand-gradient text-white text-3xl font-black uppercase">
                  {(auth.user?.email?.substring(0, 2) || "??").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 h-8 w-8 bg-primary rounded-full border-4 border-background flex items-center justify-center">
                <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight truncate max-w-full">
                {auth.user?.user_metadata?.full_name || auth.user?.email?.split('@')[0]}
              </h2>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
                {translateRole(auth.roles?.[0] || 'driver', t)}
              </p>
            </div>
            <div className="w-full pt-4 space-y-2">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/20 rounded-xl border border-border/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">Ativo</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2 bg-muted/20 rounded-xl border border-border/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">ID</span>
                <span className="text-[10px] font-mono font-bold opacity-40">#{auth.user?.id.substring(0, 8)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border-border/10 bg-card/30 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                <ProfileIcon className="h-5 w-5 text-primary" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Nome Completo</Label>
                  <Input 
                    defaultValue={auth.user?.user_metadata?.full_name || ""} 
                    placeholder="Seu nome"
                    className="rounded-xl border-border/10 bg-muted/20 h-12 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">E-mail</Label>
                  <Input 
                    defaultValue={auth.user?.email || ""} 
                    disabled
                    className="rounded-xl border-border/10 bg-muted/10 h-12 font-bold opacity-60"
                  />
                </div>
              </div>
              <Button className="w-full sm:w-auto rounded-xl font-black text-xs uppercase tracking-widest h-12 px-8">
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="rounded-[2.5rem] border-border/10 bg-card/30 backdrop-blur-xl hover:border-primary/20 transition-all cursor-pointer group">
              <CardContent className="p-8 space-y-4">
                <div className="p-3 rounded-2xl bg-primary/10 w-fit group-hover:scale-110 transition-transform">
                  <CreditCardIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-black text-lg tracking-tight">Assinatura</h3>
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">Gerencie seu plano atual e métodos de pagamento.</p>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-border/10 bg-card/30 backdrop-blur-xl hover:border-primary/20 transition-all cursor-pointer group" onClick={() => navigate({ to: "/tutorial" })}>
              <CardContent className="p-8 space-y-4">
                <div className="p-3 rounded-2xl bg-primary/10 w-fit group-hover:scale-110 transition-transform">
                  <SettingsIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-black text-lg tracking-tight">Ajuda & FAQ</h3>
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">Dúvidas frequentes e tutoriais de uso do sistema.</p>
              </CardContent>
            </Card>
          </div>

          <Button 
            variant="ghost" 
            className="w-full rounded-2xl h-16 border-2 border-destructive/10 text-destructive hover:bg-destructive/5 font-black text-xs uppercase tracking-[0.2em] gap-3"
            onClick={handleSignOut}
          >
            <LogOutIcon className="h-5 w-5" />
            Encerrar Sessão
          </Button>
        </div>
      </div>
    </div>
  );
}
