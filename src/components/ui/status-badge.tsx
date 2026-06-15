import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Badge } from "./badge";

export const statusColor: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  in_route: "bg-sky-500/10 text-sky-500",
  delivered: "bg-emerald-500/10 text-emerald-500",
  problem: "bg-destructive/10 text-destructive",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  
  const getLabel = (s: string) => {
    switch (s) {
      case "pending": return t("Pending", "Pendente");
      case "in_route": return t("In Route", "Em Rota");
      case "delivered": return t("Delivered", "Concluído");
      case "problem": return t("Problem", "Insucesso");
      default: return s;
    }
  };

  return (
    <Badge className={cn(
      "text-[10px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full border-none shadow-sm",
      statusColor[status] ?? "bg-muted text-muted-foreground",
      className
    )}>
      {getLabel(status)}
    </Badge>
  );
}
