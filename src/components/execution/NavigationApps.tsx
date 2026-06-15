import React, { memo } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Navigation } from "lucide-react";

export interface PendingStop {
  latitude: number;
  longitude: number;
}

interface NavigationAppsProps {
  latitude: number;
  longitude: number;
  address?: string;
  /** Paradas restantes (pendentes) em ordem. A primeira é a parada atual. */
  pendingStops?: PendingStop[];
  /** Localização atual do motorista, usada como origem em Google/Apple Maps. */
  userLocation?: { latitude: number; longitude: number } | null;
}

export const NavigationApps = memo(({ latitude, longitude, address, pendingStops, userLocation }: NavigationAppsProps) => {
  // Google Maps suporta até 10 destinos (1 destination + 9 waypoints) na URL pública.
  const buildGoogleUrl = () => {
    // Usar 'origin' para GPS em tempo real se disponível
    const origin = userLocation ? `${userLocation.latitude},${userLocation.longitude}` : '';
    
    if (!pendingStops || pendingStops.length <= 1) {
      return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ''}&destination=${latitude},${longitude}&travelmode=driving&dir_action=navigate`;
    }
    
    // Google Maps suporta 1 destino e múltiplos waypoints (total 10 endereços no link)
    const capped = pendingStops.slice(0, 10);
    const destination = capped[capped.length - 1];
    const waypoints = capped.slice(0, -1);
    
    const wp = waypoints.map(w => `${w.latitude},${w.longitude}`).join('|');
    const wpParam = wp ? `&waypoints=${encodeURIComponent(wp)}` : '';
    
    return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ''}&destination=${destination.latitude},${destination.longitude}${wpParam}&travelmode=driving&dir_action=navigate`;
  };

  // Apple Maps aceita múltiplos daddr (até 15 paradas no iOS 16+).
  const buildAppleUrl = () => {
    const origin = userLocation ? `&saddr=${userLocation.latitude},${userLocation.longitude}` : '';
    
    if (!pendingStops || pendingStops.length <= 1) {
      return `https://maps.apple.com/?daddr=${latitude},${longitude}${origin}&dirflg=d`;
    }
    
    // Apple Maps: daddr=L1+to:L2+to:L3
    const capped = pendingStops.slice(0, 15);
    const daddr = capped.map(s => `${s.latitude},${s.longitude}`).join('+to:');
    
    return `https://maps.apple.com/?daddr=${daddr}${origin}&dirflg=d`;
  };

  const apps = [
    {
      name: 'Google Maps',
      icon: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.9 20.1c-.6.6-1.4.6-2 0l-.1-.1c-3.1-3-7.2-7-7.2-11.4C3.6 4 7.3.3 12 .3s8.4 3.7 8.4 8.3c0 4.4-4.1 8.4-7.2 11.4l-.3.1z" fill="#4285F4"/>
          <path d="M12 12c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" fill="#EA4335"/>
        </svg>
      ),
      url: buildGoogleUrl(),
      description: 'Até 10 paradas'
    },
    {
      name: 'Waze',
      icon: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.5 13c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5z" fill="#33CCFF"/>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" fill="#33CCFF"/>
          <path d="M7.5 13c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5z" fill="#33CCFF"/>
        </svg>
      ),
      url: `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
      description: 'Próxima parada'
    },
    {
      name: 'Apple Maps',
      icon: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.05 20.28c-.96.95-2.04 1.43-3.23 1.43-1.16 0-2.22-.44-3.19-1.32-.97.88-2.05 1.32-3.22 1.32-1.19 0-2.28-.48-3.26-1.43C2.13 18.25 1 15.39 1 11.7c0-3.69 1.13-6.55 3.39-8.58C5.45 2.1 6.8 1.59 8.44 1.59c1.02 0 1.94.27 2.76.81.56.37 1.05.86 1.47 1.47.42-.61.91-1.1 1.47-1.47.82-.54 1.74-.81 2.76-.81 1.64 0 2.99.51 4.05 1.53 2.26 2.03 3.39 4.89 3.39 8.58 0 3.69-1.13 6.55-3.39 8.58z" fill="#000000"/>
        </svg>
      ),
      url: buildAppleUrl(),
      description: 'Até 15 paradas'
    },
  ];

  const openApp = (url: string, name: string) => {
    window.open(url, '_blank');
    toast.success(`Abrindo ${name}`);
  };

  const remaining = pendingStops?.length ?? 0;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-3 rounded-lg flex items-center gap-3">
        <div className="bg-blue-600 text-white p-2 rounded-full shadow-sm shrink-0">
          <Navigation className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider leading-none mb-1">
            Ir para Próxima Parada
            {remaining > 1 && <span className="ml-1 text-blue-500">· +{remaining - 1} pendente(s)</span>}
          </p>
          <p className="text-sm font-bold text-blue-900 dark:text-blue-200 truncate">{address}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {apps.map(app => (
          <Button
            key={app.name}
            variant="outline"
            size="sm"
            className="flex-col h-20 gap-1 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30 shadow-sm active:scale-95 transition-all bg-white dark:bg-slate-900 rounded-xl"
            onClick={() => openApp(app.url, app.name)}
          >
            <div className="shrink-0 drop-shadow-sm">
              {app.icon}
            </div>
            <div className="text-center">
              <span className="text-[10px] font-bold block leading-none">{app.name}</span>
              <span className="text-[8px] text-muted-foreground font-medium">{app.description}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
});
