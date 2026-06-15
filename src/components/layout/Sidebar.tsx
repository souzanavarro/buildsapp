import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  DashboardIcon, UploadIcon, MapIcon, MapPinIcon, SettingsIcon, 
  TruckIcon, UsersIcon, DownloadIcon, CreditCardIcon, ClockIcon, PackageIcon,
  LogOutIcon, ChevronRightIcon, XIcon, ActivityIcon as UserIcon, AlertTriangleIcon as BellIcon, SunIcon, MoonIcon, TrashIcon as Trash2, HomeIcon, AnalyticsIcon, SettingsIcon as IconSettings,
  SecurityIcon
} from "@/components/ui/icons";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { clearAllAppCaches } from "@/lib/clear-cache";
import { format, parseISO, startOfDay, isAfter } from "date-fns";
import { translateRole } from "@/lib/roles";
import { usePermissions } from "@/hooks/use-permissions";

const getNavItems = (t: any) => [
  { id: 'dashboard', category: 'DASHBOARD', items: [
    { to: "/dashboard", label: t("Visão Geral", "Visão Geral"), icon: DashboardIcon, permission: "dashboard" },
    { to: "/dashboard", label: t("Início", "Início"), icon: DashboardIcon, permission: "dashboard" },
    { to: "/analytics", label: t("Analytics", "Analytics"), icon: AnalyticsIcon, permission: "analytics" },
  ]},
  { id: 'operations', category: 'OPERAÇÕES', items: [
    { to: "/upload", label: t("Nova Entrega", "Nova Entrega"), icon: UploadIcon, permission: "upload" },
    { to: "/routes", label: t("Entregas", "Entregas"), icon: MapIcon, permission: "routes" },
    { to: "/map", label: t("Mapa Vivo", "Mapa Vivo"), icon: MapPinIcon, permission: "map" },
  ]},
  { id: 'fleet', category: 'FROTA', items: [
    { to: "/admin/maintenance", label: t("Veículos", "Veículos"), icon: TruckIcon, permission: "fleet" },
    { to: "/admin/maintenance", label: t("Saúde da Frota", "Saúde da Frota"), icon: AnalyticsIcon, permission: "fleet" },
    { to: "/admin/maintenance", label: t("Manutenções", "Manutenções"), icon: SettingsIcon, permission: "fleet" },
  ]},
  { id: 'customers', category: 'CLIENTES', items: [
    { to: "/admin/customer-notes", label: t("Clientes", "Clientes"), icon: UsersIcon, permission: "customers" },
    { to: "/admin/customer-notes", label: t("Histórico", "Histórico"), icon: ClockIcon, permission: "customers" },
  ]},
  { id: 'finance', category: 'FINANCEIRO', items: [
    { to: "/subscription", label: t("Plano", "Plano"), icon: CreditCardIcon, permission: "finance" },
    { to: "/subscription", label: t("Assinatura", "Assinatura"), icon: CreditCardIcon, permission: "finance" },
    { to: "/subscription", label: t("Cobranças", "Cobranças"), icon: CreditCardIcon, permission: "finance" },
  ]},
  { id: 'admin', category: 'ADMINISTRAÇÃO', items: [
    { to: "/admin/users", label: t("Usuários", "Usuários"), icon: UsersIcon, permission: "admin" },
    { to: "/admin/permissions", label: t("Permissões", "Permissões"), icon: SecurityIcon, permission: "admin" },
    { to: "/admin/deletion-logs", label: t("Logs", "Logs"), icon: ClockIcon, permission: "admin" },
  ]},

  { id: 'driver_main', category: 'MOTORISTA', items: [
    { to: "/routes", label: t("Roteiro", "Roteiro"), icon: MapIcon, roles: ["driver", "subscriber", "admin"] },
    { to: "/map", label: t("Mapas Entregas", "Mapas Entregas"), icon: MapPinIcon, roles: ["driver", "subscriber", "admin"] },
    { to: "/profile", label: t("Mais", "Mais"), icon: IconSettings, roles: ["driver", "subscriber", "admin"] },
  ]},

  { id: 'support', category: 'SUPORTE', items: [
    { to: "/tutorial", label: t("Suporte", "Suporte"), icon: BellIcon, roles: ["driver", "subscriber", "admin"] },
    { to: "/admin/app-versions", label: t("Builds", "Builds"), icon: PackageIcon, permission: "builds" },
  ]},
];


export const Sidebar = memo(({ auth, isOpen, onClose, isInstalled, deferredPrompt, onInstall }: any) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);
  const { hasPermission } = usePermissions();

  const menuGroups = useMemo(() => {
    return getNavItems(t).map(group => ({
      ...group,
      items: group.items.filter(item => {
        if ('permission' in item) {
          return hasPermission(item.permission as string);
        }
        if ('roles' in item) {
          return (item.roles as string[]).some(role => auth.roles.includes(role as any));
        }
        return true;
      })
    })).filter(group => group.items.length > 0);
  }, [auth.roles, t, hasPermission]);


  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isExpired = useMemo(() => {
    if (!auth.expiresAt) return false;
    const expiryDate = startOfDay(parseISO(auth.expiresAt));
    const today = startOfDay(new Date());
    return isAfter(today, expiryDate) || !auth.isActive;
  }, [auth.expiresAt, auth.isActive]);

  return (
    <motion.aside
      className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 bg-sidebar backdrop-blur-2xl border-r border-sidebar-border/20 flex flex-col shadow-2xl transition-all duration-500 h-full shrink-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      initial={false}
      animate={{ width: isExpanded ? 280 : 88 }}
    >
      {/* Cabeçalho */}
      <div className="h-20 flex items-center px-6 gap-4 border-b border-sidebar-border/10">
        <motion.div 
          whileHover={{ scale: 1.1, rotate: 8 }}
          className="bg-brand-gradient rounded-2xl p-2.5 shadow-xl shadow-primary/20"
        >
          <TruckIcon className="h-6 w-6 text-primary-foreground" />
        </motion.div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 min-w-0"
            >
              <h1 className="font-black tracking-tighter text-lg leading-none">ROTA CERTA</h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-1 font-bold">Gestão Inteligente</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Perfil */}
      <div className="px-4 py-6">
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-2xl bg-sidebar-accent/30 border border-sidebar-border/10 transition-all shadow-sm",
          !isExpanded && "justify-center px-0"
        )}>
          <Avatar className="h-10 w-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-sidebar">
            <AvatarFallback className="bg-brand-gradient text-white text-xs font-black">
              {auth.user?.user_metadata?.name?.substring(0, 2).toUpperCase() || (auth.user?.email?.substring(0, 2) || "??").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate text-foreground/90">{auth.user?.user_metadata?.name || auth.user?.email?.split('@')[0]}</p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <p className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-tight">
                  ONLINE • {translateRole(auth.roles?.[0] || 'driver', t).toUpperCase()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-8 custom-scrollbar pb-10">
        {menuGroups.map((group) => (
          <div key={group.id} className="space-y-2">
            {isExpanded && (
              <p className="px-4 text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase">
                {group.category}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                      !isExpanded && "justify-center px-0"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive ? "text-white" : "group-hover:text-primary")} />
                    {isExpanded && <span className="text-[13px] font-bold tracking-tight flex-1">{item.label}</span>}
                    {isActive && isExpanded && <ChevronRightIcon className="h-4 w-4 opacity-50" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Premium Card */}
        {isExpanded && auth.user && (auth.roles.includes("admin") || auth.roles.includes("subscriber")) && (
          <div className="px-2 pt-4">
            <div className={cn(
              "p-4 rounded-[2rem] border relative overflow-hidden group transition-all duration-500",
              isExpired ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20"
            )}>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                   <div className={cn(
                     "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                     isExpired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                   )}>
                     {isExpired ? "Expirado" : "Premium Plus"}
                   </div>
                   <div className={cn("h-2 w-2 rounded-full", isExpired ? "bg-destructive animate-pulse" : "bg-primary")} />
                </div>
                <p className="text-xs font-bold opacity-70 mb-1">{isExpired ? "Renove sua assinatura" : "Plano Ativo"}</p>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  Validade: {auth.expiresAt ? format(parseISO(auth.expiresAt), "dd/MM/yyyy") : "--/--/----"}
                </p>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-[10px] font-black uppercase tracking-widest text-primary mt-3"
                  onClick={() => navigate({ to: "/subscription" })}
                >
                  Gerenciar Assinatura
                </Button>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TruckIcon size={80} />
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Rodapé */}
      <div className="p-4 mt-auto border-t border-sidebar-border/10 space-y-2">
        {!isInstalled && deferredPrompt && isExpanded && (
          <Button 
            variant="outline"
            className="w-full justify-start gap-3 rounded-xl h-11 text-xs font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white"
            onClick={onInstall}
          >
            <DownloadIcon className="h-4 w-4" />
            <span>Instalar App</span>
          </Button>
        )}
        
        {isExpanded && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 rounded-xl h-11 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              if (confirm("Limpar todo o cache do app?")) clearAllAppCaches(queryClient);
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span>Limpar Cache</span>
          </Button>
        )}

        <Button 
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 rounded-xl h-11 text-xs font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:text-destructive",
            !isExpanded && "justify-center"
          )}
          onClick={signOut}
        >
          <LogOutIcon className="h-4 w-4" />
          {isExpanded && <span>Sair</span>}
        </Button>

        {/* Idioma e Toggle Sidebar */}
        <div className={cn("flex items-center pt-2 gap-2", !isExpanded && "flex-col")}>
          <div className="flex-1 flex gap-1">
             {['pt', 'en', 'es'].map(lang => (
               <button 
                 key={lang}
                 onClick={() => i18n.changeLanguage(lang)}
                 className={cn(
                   "text-[10px] font-black uppercase px-2 py-1 rounded-md transition-all",
                   i18n.language === lang ? "bg-primary text-white" : "text-muted-foreground hover:bg-sidebar-accent"
                 )}
               >
                 {lang}
               </button>
             ))}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden lg:flex h-8 w-8 rounded-lg"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronRightIcon className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </Button>
        </div>
      </div>
      
      {/* Mobile Close */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="lg:hidden absolute top-4 -right-12"
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/10"
              onClick={onClose}
            >
              <XIcon className="h-8 w-8" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
});

Sidebar.displayName = "Sidebar";
