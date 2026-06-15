import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';

export async function setAppStatusBar(theme: 'light' | 'dark') {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (theme === 'dark') {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#1a1c22' });
    } else {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    }
  } catch (err) {
    console.error('StatusBar error:', err);
  }
}

/**
 * Solicita permissão e envia notificação local.
 * Notificações locais aparecem no Android Auto/CarPlay quando o app está em segundo plano.
 */
export async function sendLocalNotification(title: string, body: string, id: number = 1, phone?: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      const actions = [];
      if (phone) {
        actions.push({ id: 'call', title: 'Ligar para Cliente' });
      }
      actions.push({ id: 'arrive', title: 'Cheguei (Confirmar)' });

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'default',
            actionTypeId: 'DELIVERY_ACTIONS',
            extra: { phone },
          },
        ],
      });
      
      // Registrar os tipos de ação se ainda não estiverem
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'DELIVERY_ACTIONS',
            actions: [
              { id: 'arrive', title: '✅ CHEGUEI', foreground: true },
              { id: 'call', title: '📞 LIGAR', foreground: false }
            ]
          }
        ]
      });

    } catch (err) {
      console.error('LocalNotification error:', err);
    }
  } else if ('Notification' in window) {
    // Fallback para Web Browser
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    }
  }
}

/**
 * Abre o mapa com o link otimizado para navegação nativa.
 */
export function openNavigationApp(latitude: number, longitude: number, label: string = 'Destino') {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isAndroid) {
    // Intent específica para Google Maps no Android (abre direto no modo navegação)
    window.open(`google.navigation:q=${latitude},${longitude}`, '_system');
  } else if (isIOS) {
    // Link para Apple Maps no iOS
    window.open(`maps://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`, '_system');
  } else {
    // Fallback para Google Maps Web
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
  }
}

