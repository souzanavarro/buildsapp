import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { permissionsService } from "@/services/permissions-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SecurityIcon as Shield, ClockIcon as AlertCircle } from "@/components/ui/icons";
import { toast } from "sonner";
import { AppRole } from "@/hooks/use-auth";
import { translateRole } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";


export const Route = createFileRoute("/admin/permissions")({
  component: () => <AppShell><AdminPermissions /></AppShell>
});

const PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Acesso ao painel principal' },
  { id: 'analytics', label: 'Analytics', desc: 'Acesso aos relatórios de desempenho' },
  { id: 'upload', label: 'Upload', desc: 'Permissão para carregar novas entregas' },
  { id: 'routes', label: 'Entregas', icon: 'Map', desc: 'Gerenciamento de rotas e entregas' },
  { id: 'map', label: 'Mapa Vivo', desc: 'Visualização do mapa em tempo real' },
  { id: 'fleet', label: 'Veículos/Frota', desc: 'Gestão de veículos e manutenção' },
  { id: 'customers', label: 'Clientes', desc: 'Acesso ao cadastro de clientes' },
  { id: 'finance', label: 'Financeiro', desc: 'Gerenciamento de assinaturas e faturas' },
  { id: 'admin', label: 'Administração', desc: 'Acesso total às configurações do sistema' },
  { id: 'builds', label: 'Builds', desc: 'Acesso ao construtor de APK e histórico de builds' },
];

const ROLES: AppRole[] = ['admin', 'subscriber'];

function AdminPermissions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: rolePermissions, isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => permissionsService.getRolePermissions(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ role, permission, enabled }: { role: AppRole, permission: string, enabled: boolean }) =>
      permissionsService.updateRolePermission(role, permission, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      toast.success(t("Permissão atualizada", "Permissão atualizada"));
    },
    onError: (error: any) => {
      toast.error(t("Erro ao atualizar permissão", "Erro ao atualizar permissão") + ": " + error.message);
    }
  });

  const hasPermission = (role: AppRole, permission: string) => {
    return rolePermissions?.some(rp => rp.role === role && rp.permission_text === permission) ?? false;
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-[2rem]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
            <Shield className="h-4 w-4" />
            {t("Configurações", "Configurações")}
          </div>
          <h1 className="text-3xl font-black tracking-tight">{t("Permissões por Papel", "Permissões por Papel")}</h1>
          <p className="text-muted-foreground font-medium text-sm">
            {t("Controle o que cada tipo de usuário pode acessar no sistema.", "Controle o que cada tipo de usuário pode acessar no sistema.")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {ROLES.map(role => (
          <Card key={role} className="rounded-[2.5rem] border-border/10 bg-card/30 backdrop-blur-xl overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/10 py-6">
              <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center justify-between">
                <span>{translateRole(role, t)}</span>
                <RoleBadge className={role === 'admin' ? "bg-primary" : "bg-muted text-muted-foreground"}>
                  {role.toUpperCase()}
                </RoleBadge>
              </CardTitle>

            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {PERMISSIONS.map(permission => (
                <div key={permission.id} className="flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">{permission.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{permission.desc}</p>
                  </div>
                  <Switch 
                    checked={hasPermission(role, permission.id)}
                    disabled={role === 'admin' && permission.id === 'admin'} // Admin must always have admin permission
                    onCheckedChange={(enabled) => updateMutation.mutate({ role, permission: permission.id, enabled })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex items-start gap-4">
        <div className="p-2 bg-primary/10 rounded-xl">
          <AlertCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-primary">Importante</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            As alterações de permissões são aplicadas em tempo real. Usuários conectados podem precisar recarregar a página para que as novas restrições de interface entrem em vigor.
          </p>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <Badge className={cn("text-[10px] font-black px-2 py-1 rounded-md", className)}>
      {children}
    </Badge>
  );
}

import { cn } from "@/lib/utils";

