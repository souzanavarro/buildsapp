import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface RouteStatItemProps {
  label: string;
  value: string | number;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  color?: string;
  bg?: string;
  description?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function RouteStatItem({
  label,
  value,
  icon: Icon,
  color = "text-primary",
  bg = "bg-primary/10",
  description,
  className,
  size = "md",
  onClick
}: RouteStatItemProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-6 xs:p-8 rounded-[32px] border-border/10 bg-card/40 backdrop-blur-[32px] transition-all duration-700 hover:border-primary/40 premium-shadow group/stat",
        onClick && "cursor-pointer hover:-translate-y-2",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] xs:text-[10px] uppercase tracking-widest text-muted-foreground font-black opacity-60 truncate">
          {label}
        </span>
        <Icon className={cn(
          size === "sm" ? "h-4 w-4" : "h-6 w-6",
          color,
          "shrink-0 transition-transform duration-500 group-hover/stat:scale-125 group-hover/stat:rotate-12"
        )} />
      </div>
      <div className={cn(
        "mt-4 font-black tracking-tighter truncate leading-none",
        size === "lg" ? "text-2xl xs:text-3xl sm:text-4xl lg:text-5xl" : "text-xl xs:text-2xl sm:text-3xl"
      )}>
        {value}
      </div>

      {description && (
        <p className="mt-1 text-[8px] xs:text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
          {description}
        </p>
      )}
    </div>
  );
}
