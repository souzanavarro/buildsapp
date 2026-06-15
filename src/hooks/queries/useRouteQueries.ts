import { useQuery, useQueryClient } from "@tanstack/react-query";
import { routeService, deliveryService } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";


export function useDashboardStats(
  formattedRange: { from: string; to: string } | null,
  driverId?: string | null,
  forceSelf?: boolean,
) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: ["dashboard-stats", userId, formattedRange, driverId ?? null, !!forceSelf],
    queryFn: async () => {
      if (!formattedRange) return null;
      return routeService.getDashboardStats(
        formattedRange.from,
        formattedRange.to,
        driverId,
        forceSelf,
      );
    },
    enabled: !!formattedRange && !!userId,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

export function useRoutes(formattedRange: { from: string; to: string } | null) {
  const { user, roles } = useAuth();
  const userId = user?.id ?? null;
  const isAdmin = roles?.includes("admin") ?? false;
  return useQuery({
    queryKey: ["routes", userId, isAdmin, formattedRange],
    queryFn: () =>
      routeService.getRoutes(formattedRange?.from, formattedRange?.to, { userId, isAdmin }),
    enabled: !!userId,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });
}


export function useRouteDetail(id: string) {
  return useQuery({
    queryKey: ["route", id],
    queryFn: async () => {
      const [route, deliveries] = await Promise.all([
        routeService.getRouteById(id),
        deliveryService.getDeliveriesByRoute(id),
      ]);
      return { route, deliveries };
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useAvailableRoutes(formattedRange: { from: string; to: string } | null) {
  return useQuery({
    queryKey: ["available-routes-map", formattedRange],
    queryFn: () => routeService.getRoutes(formattedRange?.from, formattedRange?.to),
    enabled: !!formattedRange,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRouteDeliveries(routeId: string | undefined) {
  return useQuery({
    queryKey: ["all-deliveries-map", routeId],
    queryFn: () => deliveryService.getDeliveriesByRoute(routeId!),
    enabled: !!routeId,
    staleTime: 1000 * 60 * 10, // Aumentado para 10 minutos
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

export function usePrefetchRoute() {
  const queryClient = useQueryClient();

  const prefetch = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ["route", id],
      queryFn: async () => {
        const [route, deliveries] = await Promise.all([
          routeService.getRouteById(id),
          deliveryService.getDeliveriesByRoute(id),
        ]);
        return { route, deliveries };
      },
      staleTime: 1000 * 60 * 10,
    });
  };

  return prefetch;
}
