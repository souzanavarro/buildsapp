import { Button } from "@/components/ui/button";
import {
  MenuIcon as List,
  MapPinIcon as Target,
  EyeIcon as Eye,
  WifiOffIcon as EyeOff,
  CheckIcon as CheckCircle2,
  AlertTriangleIcon as AlertTriangle,
  ClockIcon as Clock,
  MapIcon,
  XIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { triggerFitAll } from "@/lib/nav-settings";

interface NavigationControlsProps {
  onOpenList: () => void;
  onRecenter: () => void;
  showDelivered: boolean;
  onToggleDelivered: () => void;
  mapFilter: 'all' | 'pending' | 'problem' | 'next10';
  onSetMapFilter: (filter: any) => void;
}

const FILTERS: { id: 'all' | 'pending' | 'problem' | 'next10'; icon: any; color: string; title: string }[] = [
  { id: 'all', icon: List, color: 'text-muted-foreground', title: 'Todas as paradas' },
  { id: 'pending', icon: CheckCircle2, color: 'text-sky-500', title: 'Apenas pendentes' },
  { id: 'problem', icon: AlertTriangle, color: 'text-destructive', title: 'Apenas com problema' },
  { id: 'next10', icon: Clock, color: 'text-amber-500', title: 'Próximas 10 entregas' },
];

export function NavigationControls({
  onOpenList, onRecenter, showDelivered, onToggleDelivered,
  mapFilter, onSetMapFilter
}: NavigationControlsProps) {
  const resetFilters = () => {
    onSetMapFilter('all');
    if (!showDelivered) onToggleDelivered();
  };

  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2 items-end max-h-[calc(100%-2rem)] overflow-y-auto">
      {/* Main actions */}
      <div className="flex flex-col gap-1.5 p-1.5 bg-card/85 backdrop-blur-md rounded-2xl border border-border/40 shadow-2xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenList}
          title="Abrir lista de entregas"
          className="h-11 w-11 rounded-xl text-primary hover:bg-primary/10 active:scale-95 transition-all"
        >
          <List className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRecenter}
          title="Centralizar na minha localização"
          className="h-11 w-11 rounded-xl hover:bg-muted active:scale-95 transition-all"
        >
          <Target className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => triggerFitAll()}
          title="Ver rota completa no mapa"
          className="h-11 w-11 rounded-xl text-emerald-500 hover:bg-emerald-500/10 active:scale-95 transition-all"
        >
          <MapIcon className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDelivered}
          title={showDelivered ? "Ocultar entregas finalizadas" : "Mostrar entregas finalizadas"}
          className={cn(
            "h-11 w-11 rounded-xl active:scale-95 transition-all",
            showDelivered ? "text-muted-foreground hover:bg-muted" : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {showDelivered ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-1.5 p-1.5 bg-card/85 backdrop-blur-md rounded-2xl border border-border/40 shadow-2xl">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            variant="ghost"
            size="icon"
            onClick={() => onSetMapFilter(f.id)}
            title={f.title}
            className={cn(
              "h-10 w-10 rounded-xl transition-all active:scale-95",
              mapFilter === f.id ? "bg-primary/10 " + f.color : "text-muted-foreground/40 hover:text-muted-foreground"
            )}
          >
            <f.icon className="h-5 w-5" />
          </Button>
        ))}

        {/* Reset filters (new) */}
        <div className="h-px w-6 bg-border/40 mx-auto my-0.5" />
        <Button
          variant="ghost"
          size="icon"
          onClick={resetFilters}
          title="Limpar filtros e ver todas as entregas"
          className="h-10 w-10 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted active:scale-95 transition-all"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
