import { useAuth } from "./use-auth";
import { useQuery } from "@tanstack/react-query";
import { permissionsService } from "@/services/permissions-service";

export function usePermissions() {
  const { roles } = useAuth();
  
  const { data: rolePermissions } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => permissionsService.getRolePermissions(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const hasPermission = (permission: string) => {
    if (roles.includes("admin")) return true; // Admin has all permissions
    
    return roles.some(role => 
      rolePermissions?.some(rp => rp.role === role && rp.permission_text === permission)
    );
  };

  return { hasPermission, isLoading: !rolePermissions && roles.length > 0 };
}
