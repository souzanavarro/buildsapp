import { AppRole } from "@/hooks/use-auth";

export const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-primary text-primary-foreground';
    case 'subscriber':
      return 'bg-blue-500 text-white';
    case 'driver':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const translateRole = (role: string, t?: any) => {
  const translations: Record<string, string> = {
    admin: 'Administrador',
    subscriber: 'Motorista',
    driver: 'Motorista',
    manager: 'Gerente'
  };
  
  if (t) {
    return t(translations[role] || role, translations[role] || role);
  }
  
  return translations[role] || role;
};
