import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";

/**
 * Gera um link de evento para o Google Calendar com as entregas.
 * Isso permite que o Android Auto sugira os destinos automaticamente.
 */
export async function syncRouteToCalendar(deliveries: any[], routeName: string) {
  if (!deliveries || deliveries.length === 0) return;

  const pendingStops = deliveries
    .filter(d => d.status !== 'delivered' && d.status !== 'problem')
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  if (pendingStops.length === 0) {
    toast.info("Nenhuma entrega pendente para sincronizar.");
    return;
  }

  // Pegamos a primeira entrega para sugerir como evento imediato
  const nextStop = pendingStops[0];
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 30 * 60000); // +30 min

  const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

  const title = `Entrega #${nextStop.sequence}: ${nextStop.destination_address}`;
  const location = `${nextStop.latitude},${nextStop.longitude}`;
  const details = `Roteiro: ${routeName}\nTotal de volumes: ${deliveries.length}`;

  const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(startTime)}/${formatDate(endTime)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;

  if (Capacitor.isNativePlatform()) {
    // No Android nativo, abrimos via Intent de Calendar
    window.open(gCalUrl, '_system');
  } else {
    // No Web, abre o Google Calendar
    window.open(gCalUrl, '_blank');
  }

  toast.success("Evento enviado ao Calendário!", {
    description: "O Android Auto agora deve sugerir este destino ao iniciar o carro."
  });
}
