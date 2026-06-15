import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchIcon as Search, ScanIcon as ScanLine, XIcon as X, MenuIcon as List, CheckIcon as CheckCircle2 } from "@/components/ui/icons";
import { DeliveryItem } from "@/components/DeliveryItem";

interface DeliveryListDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onScan: () => void;
  filteredDeliveries: any[];
  onSelectStop: (id: string) => void;
  onMarkAllDelivered?: () => void;
}

export function DeliveryListDrawer({ 
  isOpen, onOpenChange, searchTerm, onSearchChange, 
  onScan, filteredDeliveries, onSelectStop,
  onMarkAllDelivered
}: DeliveryListDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] h-[85vh] rounded-t-[2.5rem] border-none bg-background/95 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="mx-auto w-12 h-1.5 rounded-full bg-muted/40 mt-3 mb-1" />
        <DrawerHeader className="px-6 sm:px-8 pt-4 pb-4">
          <DrawerTitle className="text-xl sm:text-2xl font-black flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <List className="h-5 w-5 sm:h-6 sm:w-6" /> 
                </div>
                Lista de Entregas
             </div>
             <Badge variant="outline" className="rounded-full px-4 border-primary/20 bg-primary/5 text-primary font-bold">
               {filteredDeliveries.length} volumes
             </Badge>
          </DrawerTitle>
          
          {onMarkAllDelivered && filteredDeliveries.some(d => d.status !== 'delivered') && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full h-10 rounded-xl border-emerald-500/20 bg-emerald-500/5 text-emerald-600 font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                onClick={() => {
                  if (confirm("Deseja marcar todas as entregas pendentes deste roteiro como entregues?")) {
                    onMarkAllDelivered();
                  }
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Marcar Tudo como Entregue
              </Button>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <div className="relative flex-1 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
               <Input 
                 placeholder="Buscar endereço ou código..." 
                 className="pl-11 h-14 rounded-2xl bg-muted/30 border-none font-bold text-sm focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                 value={searchTerm}
                 onChange={(e) => onSearchChange(e.target.value)}
               />
               {searchTerm && (
                 <button onClick={() => onSearchChange("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all">
                   <X className="h-4 w-4" />
                 </button>
               )}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-14 w-14 rounded-2xl border-border/20 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm active:scale-95"
              onClick={onScan}
            >
               <ScanLine className="h-6 w-6" />
            </Button>
          </div>
        </DrawerHeader>
        <div className="px-4 sm:px-6 pb-12 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="space-y-4 pt-4 pb-10">
            {filteredDeliveries.map((d, idx) => (
              <DeliveryItem 
                key={d.id} 
                delivery={d} 
                isSelected={false}
                index={idx}
                onSelect={(id) => {
                  onSelectStop(id);
                  onOpenChange(false);
                }} 
              />
            ))}
            {filteredDeliveries.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                 <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground/30">
                   <Search className="h-10 w-10" />
                 </div>
                 <div className="text-muted-foreground font-bold tracking-tight">Nenhuma entrega encontrada.</div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
