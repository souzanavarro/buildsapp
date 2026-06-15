import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { DateFilterProvider, useDateFilter } from "@/contexts/DateFilterContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/useTheme";
import { logErrorToSupabase } from "@/lib/error-logger";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/lib/i18n";


import appCss from "../styles.css?url";
import {
  Loader2,
  AlertTriangleIcon as AlertTriangle,
  TruckIcon as Truck,
} from "@/components/ui/icons";


export function PendingComponent() {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl transition-all duration-500">
      <div className="flex flex-col items-center gap-6 p-10 rounded-[40px] bg-card/40 border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 glass">
        <div className="relative">
          <motion.div
            animate={{ 
              x: [-20, 20, -20],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Truck className="h-16 w-16 text-primary drop-shadow-[0_0_15px_rgba(255,140,0,0.5)]" />
          </motion.div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-primary/20 rounded-full blur-md animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xl font-black tracking-tighter text-foreground animate-pulse">
            {t("Otimizando rotas...", "Otimizando rotas...")}
          </p>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="h-1.5 w-1.5 bg-primary rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


function NotFoundComponent() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-brand-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{i18n.t("Página não encontrada", "Página não encontrada")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {i18n.t("A página que você procura não existe ou foi movida.", "A página que você procura não existe ou foi movida.")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {i18n.t("Voltar ao início", "Voltar ao início")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const location = useLocation();
  const auth = useAuth();
  const { user } = auth;

  useEffect(() => {
    // Registra o erro no Supabase para análise posterior
    logErrorToSupabase({
      error,
      route: location.pathname,
      userId: user?.id,
      metadata: {
        context: "RouteErrorComponent",
        authError: auth.error?.message,
        authLoading: auth.loading,
        roles: auth.roles,
      },
    });
  }, [error, location.pathname, user?.id, auth.error, auth.loading, auth.roles]);

  const isAuthError = auth.error || (!auth.loading && !auth.user);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isAuthError ? "Problema de Acesso" : "Opa! Algo deu errado"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isAuthError
              ? "Sua sessão pode ter expirado ou houve um erro de conexão. Tente entrar novamente para continuar."
              : "Não conseguimos carregar esta parte do aplicativo. Pode ser uma instabilidade momentânea na conexão."}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              // Tenta limpar caches do router e resetar
              router.invalidate();
              reset();
              // Força um pequeno delay antes de recarregar se for erro de auth
              if (isAuthError) {
                toast.loading("Reiniciando sessão...");
                setTimeout(() => window.location.reload(), 1000);
              }
            }}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-4 py-4 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/20"
          >
            {isAuthError ? "Entrar Novamente" : "Tentar Carregar Agora"}
          </button>
          {!isAuthError && (
            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center rounded-xl bg-secondary/50 px-4 py-4 text-sm font-bold text-secondary-foreground transition-all hover:bg-secondary/80 active:scale-95"
            >
              Recarregar Aplicativo Inteiro
            </button>
          )}
          <Link
            to="/dashboard"
            className="w-full inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground transition-all hover:bg-secondary/80"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-visual",
      },
      { name: "theme-color", content: "#000000", media: "(prefers-color-scheme: dark)" },
      { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Rota Certa" },
      { title: "Rota Certa — Gestão inteligente de entregas" },
      {
        name: "description",
        content:
          "Roteirização inteligente, mapa em tempo real e gestão de entregas. Ferramenta independente de organização de rotas.",
      },
      { name: "author", content: "Rota Certa" },
      { property: "og:title", content: "Rota Certa — Gestão inteligente de entregas" },
      {
        property: "og:description",
        content:
          "Roteirização inteligente, mapa em tempo real e gestão de entregas. Ferramenta independente de organização de rotas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Rota Certa — Gestão inteligente de entregas" },
      {
        name: "twitter:description",
        content:
          "Roteirização inteligente, mapa em tempo real e gestão de entregas. Ferramenta independente de organização de rotas.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9353cece-bb9f-4803-ba91-e10206f27841/id-preview-f64f46fb--76dd5606-d816-4114-8128-51c33ef67889.lovable.app-1779419852287.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9353cece-bb9f-4803-ba91-e10206f27841/id-preview-f64f46fb--76dd5606-d816-4114-8128-51c33ef67889.lovable.app-1779419852287.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "google-site-verification", content: "CRMnGHU8LUNB2k2UUV9Q_1oFK74z33S2L7fc_UP7E74" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icon.svg" },
      { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" },
      { rel: "preconnect", href: "https://kbnwyzrghghfuyrobnaa.supabase.co" },
      { rel: "dns-prefetch", href: "https://kbnwyzrghghfuyrobnaa.supabase.co" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PendingComponent,
});


function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        <Suspense fallback={<PendingComponent />}>
          {children}
        </Suspense>
        <Scripts />
      </body>
    </html>
  );
}


function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const auth = useAuth();
  const { theme } = useTheme();

  // If user is not authenticated and we are not on the auth page, redirect
  const location = useLocation();
  const navigate = useRouter().navigate;
  
  useEffect(() => {
    if (!auth.loading && !auth.user && location.pathname !== "/auth") {
      navigate({ to: "/auth", replace: true });
    }
  }, [auth.loading, auth.user, location.pathname, navigate]);



  // React Query global optimization
  useEffect(() => {
    // Only set if they differ from what was set in getRouter to avoid unnecessary updates
    const current = queryClient.getDefaultOptions();
    if (current.queries?.staleTime !== 1000 * 60 * 5) {
      queryClient.setDefaultOptions({
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes standard
          gcTime: 1000 * 60 * 30, // 30 minutes in cache
          refetchOnWindowFocus: false,
          retry: 1,
        },
      });
    }
  }, [queryClient]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    const registerServiceWorker = () => {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        if (cancelled) return;
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              const { t } = i18n;
              toast.info(t("New version available"), {
                description: t("Update to the latest improvements"),
                action: {
                  label: t("Update"),
                  onClick: () => window.location.reload(),
                },
                duration: 10000,
              });
            }
          };
        };

      }).catch(() => undefined);
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LocationProvider>
        <DateFilterProvider>
          {auth.user && <AppBadgeSync />}
          {auth.user && <PostLoginPrefetch />}
          <Suspense fallback={<PendingComponent />}>
            <Outlet />
          </Suspense>

          <Toaster richColors position="top-right" theme={theme} closeButton />
        </DateFilterProvider>
      </LocationProvider>
    </QueryClientProvider>
  );
}


// Pré-busca dados essenciais (dashboard + roteiros) assim que o usuário
// estiver autenticado, para que a primeira renderização das telas
// principais seja instantânea.

function PostLoginPrefetch() {
  const auth = useAuth();
  const { queryClient } = Route.useRouteContext();
  const { formattedRange } = useDateFilter();
  const userId = auth.user?.id;
  const rangeFrom = formattedRange?.from;
  const rangeTo = formattedRange?.to;

  useEffect(() => {
    if (!userId || !rangeFrom || !rangeTo) return;
    let cancelled = false;

    const prefetch = async () => {
      const { routeService } = await import("@/services/api");
      if (cancelled) return;
      const range = { from: rangeFrom, to: rangeTo };
      queryClient.prefetchQuery({
        queryKey: ["dashboard-stats", userId, range, null, false],
        queryFn: () => routeService.getDashboardStats(range.from, range.to),
        staleTime: 1000 * 60 * 10,
      });
      queryClient.prefetchQuery({
        queryKey: ["routes", range],
        queryFn: () => routeService.getRoutes(range.from, range.to),
        staleTime: 1000 * 60 * 15,
      });
    };

    const id = setTimeout(prefetch, 150);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [userId, rangeFrom, rangeTo, queryClient]);

  return null;
}

function AppBadgeSync() {
  const auth = useAuth();
  const userId = auth.user?.id;
  const [count, setCount] = useState(0);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // Fetch initial count
    const fetchInitial = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const { count: initialCount } = await supabase
          .from("deliveries")
          .select("id", { count: "exact", head: true })
          .eq("driver_id", userId)
          .in("status", ["pending", "in_route"]);

        if (!cancelled) setCount(initialCount || 0);
      } finally {
        fetchingRef.current = false;
      }
    };

    fetchInitial();

    // Subscribe to realtime updates - much more efficient than polling
    const channel = supabase
      .channel(`pending-deliveries-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deliveries",
          filter: `driver_id=eq.${userId}`,
        },
        () => {
          // Re-fetch count on any change to user's deliveries
          fetchInitial();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      fetchingRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !("setAppBadge" in navigator)) return;

    try {
      if (count > 0) {
        (navigator as any).setAppBadge(count).catch(() => undefined);
      } else {
        (navigator as any).clearAppBadge?.().catch(() => undefined);
      }
    } catch {
      // Badge support is optional and varies by browser/platform.
    }
  }, [count]);

  return null;
}
