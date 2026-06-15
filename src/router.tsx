import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PendingComponent } from "./routes/__root";
import { createCapacitorPersister } from "@/lib/query-persistence";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import "@/lib/i18n";



export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60, // 1 hour — evita persistir dados antigos entre sessões
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
  
  // Persist query client for offline robustness
  if (typeof window !== "undefined") {
    persistQueryClient({
      queryClient,
      persister: createCapacitorPersister(),
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      buster: "v1", // Change this to invalidate all caches
    });
  }


  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPendingComponent: PendingComponent,
    defaultPreload: "intent",
    defaultPreloadDelay: 150,
    defaultPreloadStaleTime: 1000 * 60 * 10, // 10 minutes
  });

  return router;
};
