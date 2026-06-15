import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SearchIcon as Search, MapPinIcon as MapPin } from "@/components/ui/icons";
import { toast } from "sonner";
import { searchAddress } from "@/lib/maptiler";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScanLabelButton } from "./ScanLabelButton";
import { ContinuousScanner } from "./ContinuousScanner";

interface ManualDeliveryFormProps {
  onAdd: (delivery: any) => void;
  onAddBatch?: (deliveries: any[]) => void;
  existingTrackingCodes?: string[];
}

export function ManualDeliveryForm({ onAdd, onAddBatch, existingTrackingCodes = [] }: ManualDeliveryFormProps) {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchValue.length > 3) {
        setLoading(true);
        const results = await searchAddress(searchValue);
        setSuggestions(results);
        setLoading(false);
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleSubmit = () => {
    if (!selectedAddress) {
      return toast.error(t("Selecione um endereço válido da lista", "Selecione um endereço válido da lista"));
    }

    const newDelivery = {
      destination_address: selectedAddress.address,
      latitude: selectedAddress.lat,
      longitude: selectedAddress.lng,
      status: "pending",
      spx_tn: "MANUAL-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
    };

    onAdd(newDelivery);
    
    setSelectedAddress(null);
    setSearchValue("");
    toast.success(t("Entrega adicionada manualmente!", "Entrega adicionada manualmente!"));
  };

  return (
    <div className="space-y-4 p-5 xs:p-6 bg-card rounded-2xl xs:rounded-[2rem] border border-border/40 shadow-sm">
      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 block flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" /> {t("Adicionar Parada Manual", "Adicionar Parada Manual")}
      </Label>

      <div className="grid grid-cols-1 gap-3">
        <ScanLabelButton 
          onAdd={onAdd} 
          onAddBatch={onAddBatch}
          existingTrackingCodes={existingTrackingCodes} 
        />
        <ContinuousScanner 
          onAdd={onAdd} 
          existingTrackingCodes={existingTrackingCodes} 
        />
      </div>

      <div className="relative flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("ou digite", "ou digite")}</span>
        <div className="flex-1 h-px bg-border/50" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between h-12 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20 font-bold px-4"
              >
                {selectedAddress ? (
                  <span className="truncate">{selectedAddress.address}</span>
                ) : (
                  <span className="text-muted-foreground truncate">
                    {searchValue || t("Digite o endereço...", "Digite o endereço...")}
                  </span>
                )}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl" align="start">
              <Command shouldFilter={false}>
                <CommandInput 
                  placeholder={t("Buscar endereço...", "Buscar endereço...")} 
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>
                    {loading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t("Buscando...", "Buscando...")}
                      </div>
                    ) : searchValue.length > 0 ? (
                      t("Nenhum endereço encontrado.", "Nenhum endereço encontrado.")
                    ) : (
                      t("Comece a digitar para buscar...", "Comece a digitar para buscar...")
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {suggestions.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={s.address}
                        onSelect={() => {
                          setSelectedAddress(s);
                          setSearchValue(s.address);
                          setOpen(false);
                        }}
                        className="font-medium"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedAddress?.id === s.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {s.address}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <Button 
          onClick={handleSubmit}
          className="h-12 px-8 rounded-xl bg-primary font-black shadow-lg shadow-primary/20 w-full sm:w-auto"
        >
          {t("Adicionar", "Adicionar")}

        </Button>
      </div>
      <p className="text-[10px] font-medium text-muted-foreground leading-tight px-1">
        Utilizando MapTiler para economia de custos.
      </p>
    </div>
  );
}
