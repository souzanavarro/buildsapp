import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MapPin, Package, AlertCircle, CheckCircle2, ChevronRight, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeliveryItemProps {
  delivery: any;
  onEdit: () => void;
  onRemove: () => void;
}

export function DeliveryItem({ delivery, onEdit, onRemove }: DeliveryItemProps) {
  const confidence = delivery.confidence || "high";
  const colors = {
    high: "bg-green-500/10 text-green-500 border-green-500/20",
    medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    low: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const icons = {
    high: <CheckCircle2 className="h-3 w-3" />,
    medium: <AlertCircle className="h-3 w-3" />,
    low: <AlertCircle className="h-3 w-3" />,
  };

  const labels = {
    high: "Alta Confiança",
    medium: "Revisão Sugerida",
    low: "Endereço Suspeito",
  };

  return (
    <div className="group relative bg-muted/30 hover:bg-muted/50 border border-border/10 p-4 rounded-2xl transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5", colors[confidence as keyof typeof colors])}>
              {icons[confidence as keyof typeof icons]}
              {labels[confidence as keyof typeof labels]}
            </Badge>
            
            {(delivery.package_count || 1) > 1 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-full px-2 py-0.5 font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3 w-3" />
                {delivery.package_count} Pacotes
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="font-black text-sm tracking-tight truncate flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              {delivery.destination_address}
            </h4>
            <p className="text-[11px] text-muted-foreground font-bold opacity-60 px-5">
              {delivery.neighborhood ? `${delivery.neighborhood}, ` : ""}{delivery.city}
              {delivery.zipcode ? ` • ${delivery.zipcode}` : ""}
            </p>
          </div>

          {delivery.confidence_reason && (
             <p className="text-[10px] text-muted-foreground italic px-5 leading-tight">
               Obs: {delivery.confidence_reason}
             </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onEdit}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
      
      {/* Clickable area for edit */}
      <div className="absolute inset-0 cursor-pointer" onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onEdit();
      }} />
    </div>
  );
}
