import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Search } from "lucide-react";
import { searchAddress } from "@/lib/maptiler";
import { buildDestinationAddress, normalizeAddress } from "@/lib/viacep";
import { toast } from "sonner";

interface EditDeliveryModalProps {
  delivery: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: any) => void;
}

export function EditDeliveryModal({ delivery, isOpen, onClose, onSave }: EditDeliveryModalProps) {
  const [formData, setFormData] = useState({
    destination_address: delivery?.destination_address || "",
    neighborhood: delivery?.neighborhood || "",
    city: delivery?.city || "",
    zipcode: delivery?.zipcode || "",
    spx_tn: delivery?.spx_tn || "",
    package_count: delivery?.package_count || 1,
  });
  const [loading, setLoading] = useState(false);

  const handleReGeocode = async () => {
    setLoading(true);
    try {
      const normalized = await normalizeAddress({
        address: formData.destination_address,
        neighborhood: formData.neighborhood,
        city: formData.city,
        zipcode: formData.zipcode,
      });

      const geo = await searchAddress(normalized.fullAddress, {
        street: normalized.street,
        number: normalized.number,
        neighborhood: normalized.neighborhood,
        city: normalized.city,
        zipcode: normalized.zipcode,
      });

      if (!geo || geo.length === 0) {
        toast.error("Não foi possível localizar este endereço no mapa.");
        return;
      }

      const best = geo[0];
      
      let finalConfidence = normalized.confidence;
      let finalReason = normalized.confidenceReason || "";
      if (best.quality === "approximate") {
        finalConfidence = "medium";
        finalReason += " + Número não exato";
      } else if (best.quality === "zipcode") {
        finalConfidence = "low";
        finalReason += " + Localizado pelo CEP";
      }

      const updated = {
        ...formData,
        destination_address: buildDestinationAddress(normalized, best.address),
        latitude: best.lat,
        longitude: best.lng,
        neighborhood: normalized.neighborhood,
        city: normalized.city,
        zipcode: normalized.zipcode,
        confidence: finalConfidence,
        confidence_reason: finalReason,
      };

      onSave(updated);
      toast.success("Endereço atualizado e geolocalizado!");
      onClose();
    } catch (e) {
      toast.error("Erro ao atualizar endereço.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" /> Editar Parada
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Endereço Completo</Label>
            <Input 
              value={formData.destination_address}
              onChange={e => setFormData(prev => ({ ...prev, destination_address: e.target.value }))}
              className="rounded-xl font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Bairro</Label>
              <Input 
                value={formData.neighborhood}
                onChange={e => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                className="rounded-xl font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Cidade</Label>
              <Input 
                value={formData.city}
                onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">CEP</Label>
              <Input 
                value={formData.zipcode}
                onChange={e => setFormData(prev => ({ ...prev, zipcode: e.target.value }))}
                className="rounded-xl font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Pacotes</Label>
              <Input 
                type="number"
                value={formData.package_count}
                onChange={e => setFormData(prev => ({ ...prev, package_count: parseInt(e.target.value) }))}
                className="rounded-xl font-bold"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Código de Rastreio (TN)</Label>
            <Input 
              value={formData.spx_tn}
              onChange={e => setFormData(prev => ({ ...prev, spx_tn: e.target.value }))}
              className="rounded-xl font-bold"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold">Cancelar</Button>
          <Button 
            onClick={handleReGeocode} 
            disabled={loading}
            className="rounded-xl font-black bg-primary gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Salvar e Buscar no Mapa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
