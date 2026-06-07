import type { AppNotificationPayload } from '../types';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function showNativeNotification(payload: AppNotificationPayload): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notification = new Notification(payload.title, {
    body: payload.message,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: payload.id || payload.category,
    data: payload,
  });

  notification.onclick = () => {
    window.focus();
    if (payload.linkUrl) {
      window.location.href = payload.linkUrl;
    }
    notification.close();
  };
}
