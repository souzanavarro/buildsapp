import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { adminService } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { formatDateBR } from "@/lib/format";
import { deleteUserAccount } from "@/lib/admin-users.functions";
import { translateRole } from "@/lib/roles";
import { 
  Mail, Phone, Calendar as CalendarIcon, Shield, Search, 
  MoreVertical, Key, UserMinus, UserCheck, RefreshCw, AlertCircle, Trash2
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/users")({ component: () => <AppShell><AdminUsers /></AppShell> });

function AdminUsers() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [isRenewConfirmOpen, setIsRenewConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRoleConfirmOpen, setIsRoleConfirmOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<string>("");

  const callDeleteUser = useServerFn(deleteUserAccount);

  const queryClient = useQueryClient();


  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminService.listUsers(),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: string, active: boolean }) => 
      adminService.updateUserStatus(userId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Status do usuário atualizado com sucesso!");
      setIsStatusConfirmOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  });

  const renewPlanMutation = useMutation({
    mutationFn: ({ userId, currentExpiry }: { userId: string, currentExpiry: string | null }) => 
      adminService.renewUserPlan(userId, currentExpiry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Plano renovado por mais 30 dias!");
      setIsRenewConfirmOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao renovar plano: " + error.message);
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("E-mail de redefinição enviado com sucesso!");
      setIsResetPassOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar e-mail: " + error.message);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userAuthId: string) => {
      await callDeleteUser({ data: { userId: userAuthId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário excluído com sucesso!");
      setIsDeleteConfirmOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir usuário: " + error.message);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string, role: string }) => 
      adminService.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Papel do usuário atualizado com sucesso!");
      setIsRoleConfirmOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar papel: " + error.message);
    }
  });


  const filteredUsers = users?.filter((u: any) => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-[10px] sm:text-xs uppercase tracking-widest">
             <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
             {t("Administração Global", "Administração Global")}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{t("Gestão de Usuários", "Gestão de Usuários")}</h1>
          <p className="text-muted-foreground font-medium text-xs sm:text-sm">
             {t("Gerencie o acesso, status e planos dos utilizadores.", "Gerencie o acesso, status e planos dos utilizadores.")}
          </p>
        </div>
        
        <div className="relative group w-full lg:w-80">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
           <Input 
             placeholder={t("Buscar por nome ou e-mail...", "Buscar por nome ou e-mail...")} 
             className="pl-11 h-11 rounded-xl bg-card border-border/40 focus-visible:ring-primary/40 text-sm"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>


      <Card className="rounded-2xl xs:rounded-[2.5rem] border-border/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar hidden lg:block">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border/20">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Usuário</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contato / Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plano / Validade</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Perfil</th>
                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {isLoading ? (
                 [1,2,3,4,5].map(i => (
                    <tr key={i} className="animate-pulse">
                       <td colSpan={5} className="px-8 py-6"><div className="h-8 bg-muted rounded-xl" /></td>
                    </tr>
                 ))
              ) : filteredUsers?.map((u: any) => (
                <tr key={u.id} className={cn(
                  "hover:bg-accent/30 transition-colors group",
                  !u.active && "opacity-60 bg-muted/10"
                )}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarFallback className="font-black text-xs bg-primary/10 text-primary">
                          {u.full_name?.substring(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                         <div className="font-bold text-sm tracking-tight flex items-center gap-2">
                           {u.full_name || "—"}
                           {!u.active && <Badge variant="destructive" className="text-[8px] h-4 px-1">Inativo</Badge>}
                         </div>
                         <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2 text-xs font-medium">
                          <Mail className="h-3 w-3 text-primary" /> {u.email}
                       </div>
                       <Badge variant="outline" className={cn(
                         "text-[9px] font-bold h-5",
                         u.active ? "bg-green-500/10 text-green-600 border-green-200" : "bg-red-500/10 text-red-600 border-red-200"
                       )}>
                         {u.active ? "ATIVO" : "INATIVO"}
                       </Badge>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                         <CalendarIcon className="h-3 w-3" />
                         Expira em: {u.expires_at ? formatDateBR(u.expires_at) : "Ilimitado"}
                      </div>
                      {u.expires_at && new Date(u.expires_at) < new Date() && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-destructive uppercase">
                          <AlertCircle className="h-3 w-3" /> Expirado
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <Badge variant="outline" className={cn(
                       "font-black uppercase tracking-widest text-[9px] px-3 py-1 rounded-full border-none shadow-sm",
                       u.role === 'admin' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {translateRole(u.role || "driver", t)}
                    </Badge>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-border/40">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-2">
                          Ações do Usuário
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          className="gap-3 cursor-pointer py-2.5 rounded-lg focus:bg-primary/5"
                          onClick={() => {
                            setSelectedUser(u);
                            setIsResetPassOpen(true);
                          }}
                        >
                          <Key className="h-4 w-4 text-primary" />
                          <div className="flex flex-col">
                            <span className="font-bold text-xs">Redefinir Senha</span>
                            <span className="text-[10px] text-muted-foreground">Enviar e-mail de recuperação</span>
                          </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                          className="gap-3 cursor-pointer py-2.5 rounded-lg focus:bg-primary/5"
                          onClick={() => {
                            setSelectedUser(u);
                            setIsRenewConfirmOpen(true);
                          }}
                        >
                          <RefreshCw className="h-4 w-4 text-blue-500" />
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-blue-600">Renovar Plano</span>
                            <span className="text-[10px] text-muted-foreground">+30 dias de acesso</span>
                          </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                          className="gap-3 cursor-pointer py-2.5 rounded-lg focus:bg-primary/5"
                          onClick={() => {
                            setSelectedUser(u);
                            setTargetRole(u.role === 'admin' ? 'subscriber' : 'admin');
                            setIsRoleConfirmOpen(true);
                          }}
                        >
                          <Shield className={cn("h-4 w-4", u.role === 'admin' ? "text-muted-foreground" : "text-primary")} />
                          <div className="flex flex-col">
                            <span className="font-bold text-xs">{u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {u.role === 'admin' ? 'Reduzir para motorista' : 'Dar acesso total ao sistema'}
                            </span>
                          </div>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        
                        <DropdownMenuItem 
                          className={cn(
                            "gap-3 cursor-pointer py-2.5 rounded-lg",
                            u.active ? "focus:bg-destructive/5" : "focus:bg-green-500/5"
                          )}
                          onClick={() => {
                            setSelectedUser(u);
                            setIsStatusConfirmOpen(true);
                          }}
                        >
                          {u.active ? (
                            <>
                              <UserMinus className="h-4 w-4 text-destructive" />
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-destructive">Inativar Usuário</span>
                                <span className="text-[10px] text-muted-foreground">Bloquear acesso ao sistema</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 text-green-600" />
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-green-600">Reativar Usuário</span>
                                <span className="text-[10px] text-muted-foreground">Restaurar acesso ao sistema</span>
                              </div>
                            </>
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="gap-3 cursor-pointer py-2.5 rounded-lg focus:bg-destructive/10"
                          onClick={() => {
                            setSelectedUser(u);
                            setIsDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-destructive">Excluir Usuário</span>
                            <span className="text-[10px] text-muted-foreground">Remoção permanente da conta</span>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>

                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-border/10">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="p-6 animate-pulse space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="h-6 w-32 bg-muted rounded" />
                </div>
                <div className="h-20 bg-muted rounded-xl" />
              </div>
            ))
          ) : filteredUsers?.map((u: any) => (
            <div key={u.id} className={cn("p-6 space-y-4", !u.active && "opacity-60 bg-muted/5")}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarFallback className="font-black text-xs bg-primary/10 text-primary">
                      {u.full_name?.substring(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-bold text-sm tracking-tight flex flex-wrap items-center gap-2">
                      {u.full_name || "—"}
                      {!u.active && <Badge variant="destructive" className="text-[8px] h-4 px-1">Inativo</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-border/40">
                    <DropdownMenuItem className="gap-3 cursor-pointer py-2.5 rounded-lg focus:bg-primary/5" onClick={() => { setSelectedUser(u); setIsResetPassOpen(true); }}>
                      <Key className="h-4 w-4 text-primary" />
                      <span className="font-bold text-xs">Redefinir Senha</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 cursor-pointer py-2.5 rounded-lg focus:bg-primary/5" onClick={() => { setSelectedUser(u); setIsRenewConfirmOpen(true); }}>
                      <RefreshCw className="h-4 w-4 text-blue-500" />
                      <span className="font-bold text-xs text-blue-600">Renovar Plano</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 cursor-pointer py-2.5 rounded-lg focus:bg-primary/5" onClick={() => { 
                      setSelectedUser(u); 
                      setTargetRole(u.role === 'admin' ? 'driver' : 'admin');
                      setIsRoleConfirmOpen(true); 
                    }}>
                      <Shield className={cn("h-4 w-4", u.role === 'admin' ? "text-muted-foreground" : "text-primary")} />
                      <span className="font-bold text-xs">{u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 cursor-pointer py-2.5 rounded-lg" onClick={() => { setSelectedUser(u); setIsStatusConfirmOpen(true); }}>
                      {u.active ? <><UserMinus className="h-4 w-4 text-destructive" /><span className="font-bold text-xs text-destructive">Inativar</span></> : <><UserCheck className="h-4 w-4 text-green-600" /><span className="font-bold text-xs text-green-600">Reativar</span></>}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 cursor-pointer py-2.5 rounded-lg focus:bg-destructive/10" onClick={() => { setSelectedUser(u); setIsDeleteConfirmOpen(true); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="font-bold text-xs text-destructive">Excluir</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>

                </DropdownMenu>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Status</div>
                  <Badge variant="outline" className={cn("text-[9px] font-bold h-5", u.active ? "bg-green-500/10 text-green-600 border-green-200" : "bg-red-500/10 text-red-600 border-red-200")}>
                    {u.active ? "ATIVO" : "INATIVO"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Perfil</div>
                  <Badge variant="outline" className={cn("font-black uppercase tracking-widest text-[8px] px-2 h-5 rounded-full border-none shadow-sm", u.role === 'admin' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {u.role || "driver"}
                  </Badge>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Expiração</div>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <CalendarIcon className="h-3 w-3 text-primary" />
                    {u.expires_at ? formatDateBR(u.expires_at) : "Ilimitado"}
                    {u.expires_at && new Date(u.expires_at) < new Date() && (
                      <span className="text-[9px] font-black text-destructive uppercase ml-2 flex items-center gap-1">
                        <AlertCircle className="h-2.5 w-2.5" /> Expirado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Dialogs */}
      <AlertDialog open={isResetPassOpen} onOpenChange={setIsResetPassOpen}>
        <AlertDialogContent className="rounded-3xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Redefinir Senha?</AlertDialogTitle>
            <AlertDialogDescription>
              Será enviado um e-mail para <strong>{selectedUser?.email}</strong> com as instruções para criar uma nova senha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl font-black bg-primary"
              onClick={() => resetPasswordMutation.mutate(selectedUser.email)}
            >
              Enviar E-mail
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <AlertDialogContent className="rounded-3xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">
              {selectedUser?.active ? "Inativar" : "Reativar"} Usuário?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {selectedUser?.active ? "inativar" : "reativar"} <strong>{selectedUser?.full_name}</strong>? 
              {selectedUser?.active && " O usuário perderá o acesso imediatamente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className={cn("rounded-xl font-black", selectedUser?.active ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-green-600 text-white hover:bg-green-700")}
              onClick={() => toggleStatusMutation.mutate({ userId: selectedUser.id, active: !selectedUser.active })}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRenewConfirmOpen} onOpenChange={setIsRenewConfirmOpen}>
        <AlertDialogContent className="rounded-3xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-blue-600">Renovar Plano</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja adicionar <strong>30 dias</strong> de acesso para <strong>{selectedUser?.full_name}</strong>? 
              {selectedUser?.active === false && " Isso também reativará o usuário automaticamente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl font-black bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => renewPlanMutation.mutate({ userId: selectedUser.id, currentExpiry: selectedUser.expires_at })}
            >
              Confirmar Renovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRoleConfirmOpen} onOpenChange={setIsRoleConfirmOpen}>
        <AlertDialogContent className="rounded-3xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Alterar Papel do Usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja alterar o papel de <strong>{selectedUser?.full_name}</strong> para <strong>{targetRole === 'admin' ? 'Administrador' : 'Motorista'}</strong>?
              {targetRole === 'admin' ? " O usuário terá acesso total a todas as configurações e dados globais." : " O usuário perderá o acesso administrativo."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl font-black bg-primary"
              onClick={() => updateRoleMutation.mutate({ userId: selectedUser.id, role: targetRole })}
            >
              Confirmar Alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-3xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-destructive">Excluir Conta Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a conta de <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email}) e removerá todos os dados associados dos nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl font-black bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUserMutation.mutate(selectedUser.user_id)}
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
