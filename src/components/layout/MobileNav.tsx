import { Link, useLocation } from "@tanstack/react-router";
import { memo } from "react";
import { motion } from "framer-motion";
import { 
  DashboardIcon, MapIcon, MapPinIcon, SettingsIcon, PlusIcon, ClockIcon as TutorialIcon, DownloadIcon, PackageIcon
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: any;
  isCenter?: boolean;
};

const getNavItems = (roles: string[]): NavItem[] => {
  const isAdmin = roles.includes("admin");
  const isSubscriber = roles.includes("subscriber");
  
  const items: NavItem[] = [
    { to: "/dashboard", label: "Home", icon: DashboardIcon },
    { to: "/routes", label: "Roteiro", icon: MapIcon },
  ];

  if (isAdmin || isSubscriber) {
    items.push({ to: "/upload", label: "Novo", icon: PlusIcon, isCenter: true });
    items.push({ to: "/map", label: "Mapa", icon: MapPinIcon });
    
    // For Admin/Subscriber, "Mais" leads to profile/admin
    items.push({ to: isAdmin ? "/admin" : "/profile", label: "Mais", icon: SettingsIcon });
  } else {
    // Driver items - necessary menus
    items.push({ to: "/map", label: "Mapas", icon: MapPinIcon, isCenter: true });
    items.push({ to: "/tutorial", label: "Ajuda", icon: TutorialIcon });
    items.push({ to: "/profile", label: "Mais", icon: SettingsIcon });
  }

  return items;
};


export const MobileNav = memo(({ roles = [] }: { roles?: string[] }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden pb-[calc(1.5rem+env(safe-area-inset-bottom))] px-6 pointer-events-none">
      <nav className="bg-background/80 backdrop-blur-[32px] border border-white/10 rounded-[28px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] px-4 py-2 pointer-events-auto ring-1 ring-white/5 max-w-sm mx-auto relative overflow-visible">
        <div className="flex items-center justify-between h-12">
          {getNavItems(roles).map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.to || (item.to !== "/" && currentPath.startsWith(item.to));

            if (item.isCenter) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="relative -top-7"
                >
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="h-16 w-16 rounded-[22px] shopee-gradient text-white shadow-[0_12px_24px_-5px_var(--primary-shopee)] flex items-center justify-center border-[5px] border-background/60 backdrop-blur-3xl relative"
                  >
                    <Icon className="h-8 w-8" />
                    <div className="absolute inset-0 rounded-[22px] bg-white/20 animate-pulse pointer-events-none" />
                  </motion.div>
                </Link>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 relative",
                  isActive ? "text-primary" : "text-muted-foreground/50"
                )}
              >
                <motion.div
                  animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                >
                  <Icon className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground/50")} />
                </motion.div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest leading-none mt-1.5",
                  isActive ? "text-primary opacity-100" : "text-muted-foreground/50 opacity-80"
                )}>
                  {item.label}
                </span>
                {isActive && (
                   <motion.div 
                     layoutId="mobile-nav-indicator"
                     className="absolute -bottom-1 h-1 w-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]"
                   />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
});

MobileNav.displayName = "MobileNav";