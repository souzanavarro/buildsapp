import { type ReactNode, useState, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { usePWA } from "@/hooks/usePWA";
import { useTheme } from "@/hooks/useTheme";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";

import { SkipToContent } from "@/components/ui/skip-to-content";
import { TruckIcon as Truck, WifiOffIcon as WifiOff } from "@/components/ui/icons";

import { motion, AnimatePresence } from "framer-motion";
import { PageTransition, TransitionType } from "./PageTransition";



export function AppShell({ children, transitionType }: { children: ReactNode, transitionType?: TransitionType }) {
  const auth = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const { dateRange, setDateRange } = useDateFilter();
  const { theme, toggleTheme } = useTheme();
  const { deferredPrompt, isInstalled, handleInstallClick } = usePWA();
  const { processQueue } = useSyncQueue();

  useEffect(() => {
    if (auth.loading) return;

    if (!auth.user) {
      if (location.pathname !== "/auth") {
        navigate({ to: "/auth", replace: true });
      }
      return;
    }

    const isAdmin = auth.roles.includes("admin");
    let expired = false;
    if (auth.expiresAt) {
      const exp = new Date(auth.expiresAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      exp.setHours(0, 0, 0, 0);
      expired = today > exp;
    }

    const blocked = !isAdmin && (auth.isActive === false || expired);
    if (blocked && location.pathname !== "/subscription") {
      navigate({ to: "/subscription", replace: true });
    }
  }, [auth.loading, auth.user, auth.roles, auth.isActive, auth.expiresAt, location.pathname, navigate]);


  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    
    if (navigator.onLine) {
      processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processQueue]);

  useEffect(() => {
    if (!auth.user || !auth.roles.includes("admin")) return;

    const channel = supabase
      .channel('app-builds')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_versions',
          filter: `platform=eq.android`
        },
        (payload) => {
          const newVersion = payload.new;
          toast.success("Novo Build Disponível!", {
            description: `Versão #${newVersion.version_name} (APK & AAB) disponível para download.`,
            duration: 10000,
            action: {
              label: "Ver Versões",
              onClick: () => navigate({ to: "/admin/app-versions" })
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auth.user, auth.roles]);

  if (auth.loading && !auth.user) {

    // Lightweight skeleton of the shell so the user sees structure
    // immediately instead of a blocking spinner.
    return (
      <div className="min-h-[100dvh] flex bg-background overflow-hidden">
        <div className="hidden lg:flex w-72 flex-col gap-4 p-6 border-r border-border/10">
          <div className="h-10 w-40 rounded-2xl bg-muted/40 animate-pulse" />
          <div className="space-y-2 mt-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-11 w-full rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b border-border/10 px-6 flex items-center gap-4">
            <div className="h-9 w-9 rounded-xl bg-muted/40 animate-pulse lg:hidden" />
            <div className="h-6 w-48 rounded-full bg-muted/40 animate-pulse" />
            <div className="ml-auto h-9 w-32 rounded-xl bg-muted/30 animate-pulse" />
          </div>
          <main className="flex-1 p-4 sm:p-6 lg:p-10 space-y-8 max-w-7xl w-full mx-auto">
            <div className="space-y-3">
              <div className="h-5 w-40 rounded-full bg-muted/40 animate-pulse" />
              <div className="h-12 w-64 rounded-2xl bg-muted/40 animate-pulse" />
              <div className="h-4 w-96 max-w-full rounded-full bg-muted/30 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-40 rounded-[2rem] bg-muted/30 animate-pulse" />
              ))}
            </div>
            <div className="h-[320px] rounded-[2rem] bg-muted/20 animate-pulse" />
          </main>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    if (typeof window !== "undefined") {
       navigate({ to: "/auth", replace: true });
    }
    return null;
  }



  return (
    <div className="min-h-[100dvh] h-[100dvh] flex bg-background selection:bg-primary/30 selection:text-primary-foreground overflow-hidden fixed inset-0 font-sans">
      <SkipToContent />


      <div className="absolute inset-0 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] pt-[env(safe-area-inset-top)] pointer-events-none" />

      <Sidebar 
        auth={auth} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        isInstalled={isInstalled}
        deferredPrompt={deferredPrompt}
        onInstall={handleInstallClick}
      />

      <MobileNav roles={auth.roles} />
      

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md lg:hidden transition-opacity animate-in fade-in duration-300" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 pb-[env(safe-area-inset-bottom)] lg:pb-0">
        <TopBar 
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          dateRange={dateRange}
          onSetDateRange={setDateRange}
          isOnline={isOnline}
        />

        <main id="main-content" className={cn(
          "flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar overscroll-none scroll-smooth outline-none",
          location.pathname === "/map" ? "p-0 flex flex-col" : "p-6 xs:p-8 sm:p-10 lg:p-12"
        )} tabIndex={-1}>
          <AnimatePresence mode="wait">
            {!isOnline && (
              <motion.div initial={{ height: 0, opacity: 0, scale: 0.95 }} animate={{ height: 'auto', opacity: 1, scale: 1 }} exit={{ height: 0, opacity: 0, scale: 0.95 }} className="mb-6 overflow-hidden">
                <div className="bg-destructive/10 border-2 border-destructive/20 text-destructive px-5 py-4 rounded-[1.5rem] flex items-center gap-3 shadow-lg shadow-destructive/5 backdrop-blur-sm">
                   <WifiOff className="h-5 w-5" />
                   <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t("Você está offline. Operação local ativada.", "Você está offline. Operação local ativada.")}</p>
                </div>
              </motion.div>
            )}
            <PageTransition 
              key={location.pathname}
              type={transitionType || "fade"}
              className={cn(
                "w-full pb-24 lg:pb-0",
                location.pathname === "/map" ? "max-w-none flex-1 flex flex-col" : "max-w-[1600px] mx-auto"
              )}
            >
              <Suspense fallback={<div className="h-40 w-full animate-pulse bg-muted/10 rounded-3xl" />}>
                {children}
              </Suspense>
            </PageTransition>

          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
