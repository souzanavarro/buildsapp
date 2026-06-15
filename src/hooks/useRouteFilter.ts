import { useState, useMemo, useDeferredValue } from "react";

export function useRouteFilter(routes: any[] | null | undefined) {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredRoutes = useMemo(() => {
    if (!routes) return [];
    if (!deferredSearchTerm) return routes;
    
    const term = deferredSearchTerm.toLowerCase();
    return routes.filter((r: any) => 
      r.name?.toLowerCase().includes(term) ||
      r.id?.toLowerCase().includes(term)
    );
  }, [routes, deferredSearchTerm]);

  return {
    searchTerm,
    setSearchTerm,
    filteredRoutes,
  };
}
