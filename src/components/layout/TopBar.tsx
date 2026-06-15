import { MenuIcon, SunIcon, MoonIcon, ClockIcon as CalendarIcon, WifiIcon as Wifi, WifiOffIcon as WifiOff, LogOutIcon, ActivityIcon as UserIcon, AlertTriangleIcon as BellIcon, TruckIcon, SettingsIcon, CreditCardIcon, SearchIcon } from "@/components/ui/icons";
import { useTranslation } from "react-i18next";
import { memo, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { translateRole } from "@/lib/roles";


interface TopBarProps {
  onOpenMobileMenu: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  dateRange: any;
  onSetDateRange: (range: any) => void;
  isOnline: boolean;
}

export const TopBar = memo(({ onOpenMobileMenu, theme, onToggleTheme, dateRange, onSetDateRange, isOnline }: TopBarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roles } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const parts = path.split('/').filter(Boolean);
    return [
      { label: 'Dashboard', to: '/dashboard' },
      ...parts.map((part, i) => ({
        label: part.charAt(0).toUpperCase() + part.slice(1),
        to: '/' + parts.slice(0, i + 1).join('/')
      }))
    ];
  }, [location.pathname]);

  const pageInfo = useMemo(() => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return { title: t("Visão Geral", "Visão Geral"), sub: t("Acompanhe os indicadores em tempo real.", "Acompanhe os indicadores em tempo real.") };
    if (path.startsWith("/upload")) return { title: t("Nova Entrega", "Nova Entrega"), sub: t("Cadastre novas entregas no sistema.", "Cadastre novas entregas no sistema.") };
    if (path.startsWith("/routes")) return { title: t("Entregas", "Entregas"), sub: t("Gerencie seus trajetos e entregas.", "Gerencie seus trajetos e entregas.") };
    if (path.startsWith("/map")) return { title: t("Mapa Vivo", "Mapa Vivo"), sub: t("Localização em tempo real da frota.", "Localização em tempo real da frota.") };
    return { title: t("Rota Certa", "Rota Certa"), sub: t("Gestão Inteligente", "Gestão Inteligente") };
  }, [location.pathname, t]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success(t("Sessão encerrada", "Sessão encerrada"));
      navigate({ to: "/auth" });
    } catch (e) {
      toast.error(t("Erro ao sair", "Erro ao sair"));
    }
  };

  return (
    <header className="h-[64px] md:h-[72px] border-b border-border/10 flex items-center px-4 md:px-8 gap-4 bg-background sticky top-0 z-30 transition-all duration-700">
      {/* Lado Esquerdo - Breadcrumb & Title */}
      <div className="flex flex-col flex-1 min-w-0">
        <nav className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.to} className="flex items-center gap-2">
              <Link to={crumb.to} className="hover:text-primary transition-colors">{crumb.label}</Link>
              {i < breadcrumbs.length - 1 && <span>/</span>}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            className="lg:hidden h-8 w-8" 
            onClick={onOpenMobileMenu}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-lg md:text-xl font-black tracking-tighter truncate leading-none">{pageInfo.title}</h1>
        </div>
      </div>

      {/* Centro - Pesquisa Global (Somente Admin/Subscriber) */}
      {(roles.includes("admin") || roles.includes("subscriber")) && (
        <div className="hidden lg:flex items-center flex-1 max-w-md relative group">
          <div className="absolute left-4 text-muted-foreground group-focus-within:text-primary transition-colors">
            <SearchIcon className="h-4 w-4" />
          </div>
          <input 
            type="text" 
            placeholder={t("Buscar clientes, motoristas, placas...", "Buscar clientes, motoristas, placas...")}
            className="w-full h-11 bg-muted/30 border border-border/10 rounded-2xl pl-11 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background/80 transition-all"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <div className="absolute right-4 text-[9px] font-black opacity-30 tracking-widest pointer-events-none border border-border/20 px-1.5 py-0.5 rounded-md">
            CMD + K
          </div>
        </div>
      )}

      {/* Lado Direito - Ações */}
      <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/20 border border-border/5">
          <motion.div 
            animate={isOnline ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-destructive")} 
          />
          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/5">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onToggleTheme} className="h-10 w-10 rounded-xl">
            {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-primary/5">
            <BellIcon className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-primary rounded-full ring-2 ring-background animate-pulse" />
          </Button>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="p-0 h-10 w-10 rounded-xl overflow-hidden ring-2 ring-primary/10 ring-offset-2 ring-offset-background hover:ring-primary/30 transition-all shadow-lg">
              <Avatar className="h-full w-full">
                <AvatarFallback className="bg-brand-gradient text-white text-[10px] font-black">
                  {user?.user_metadata?.name?.substring(0, 2).toUpperCase() || (user?.email?.substring(0, 2) || "??").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 rounded-[2rem] border-border/10 shadow-2xl mr-4 glass" align="end">
            <div className="px-4 py-3 border-b border-border/5 mb-2">
              <p className="text-xs font-black truncate">{user?.user_metadata?.name || user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">
                {translateRole(roles?.[0] || 'driver', t).toUpperCase()}
              </p>

            </div>
            <div className="flex flex-col gap-1 p-1">
              <Button variant="ghost" className="justify-start text-[11px] font-black uppercase tracking-widest h-11 rounded-2xl" onClick={() => navigate({ to: "/profile" })}>
                <UserIcon className="h-4 w-4 mr-3" />
                {t("Perfil", "Perfil")}
              </Button>
              {(roles.includes("admin") || roles.includes("subscriber")) && (
                <Button variant="ghost" className="justify-start text-[11px] font-black uppercase tracking-widest h-11 rounded-2xl" onClick={() => navigate({ to: "/subscription" })}>
                  <CreditCardIcon className="h-4 w-4 mr-3" />
                  {t("Assinatura", "Assinatura")}
                </Button>
              )}
              <div className="h-px bg-border/5 my-1" />
              <Button 
                variant="ghost" 
                className="justify-start text-[11px] font-black uppercase tracking-widest h-11 rounded-2xl text-destructive hover:bg-destructive/5"
                onClick={() => setConfirmLogout(true)}
              >
                <LogOutIcon className="h-4 w-4 mr-3" />
                {t("Sair", "Sair")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent className="rounded-[2.5rem] border-border/10 glass">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black tracking-tight text-xl">{t("Sair do sistema?", "Sair do sistema?")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium opacity-70">
              {t("Você precisará fazer login novamente para acessar o painel.", "Você precisará fazer login novamente para acessar o painel.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-2xl font-bold h-12">{t("Cancel", "Cancelar")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="rounded-2xl bg-destructive text-white hover:bg-destructive/90 font-bold h-12">
              {t("Sair", "Sair")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
});

TopBar.displayName = "TopBar";
