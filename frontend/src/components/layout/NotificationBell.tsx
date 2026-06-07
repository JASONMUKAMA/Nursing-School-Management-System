import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { eventsApi } from '../../api/endpoints';
import { startNotificationConnection, type SignalRStatus } from '../../api/signalr';
import { useAuth } from '../../hooks/useAuth';
import { requestNotificationPermission, showNativeNotification } from '../../utils/pushNotifications';

import type { AppNotification, AppNotificationPayload } from '../../types';

const CATEGORY_ICONS: Record<string, string> = {
  Finance: '💰',
  Admissions: '📝',
  Events: '📅',
  Clinical: '🏥',
  System: '⚙️',
};

function formatWhen(sentAt: string): string {
  const date = new Date(sentAt);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function payloadToNotification(payload: AppNotificationPayload): AppNotification {
  return {
    id: payload.id,
    title: payload.title,
    message: payload.message,
    category: payload.category,
    linkUrl: payload.linkUrl,
    sentAt: payload.sentAt,
    isRead: false,
  };
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [signalRStatus, setSignalRStatus] = useState<SignalRStatus>('connecting');
  const [toast, setToast] = useState<AppNotificationPayload | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const loadNotifications = useCallback(async () => {
    try {
      const items = await eventsApi.getNotifications();
      setNotifications(items);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void requestNotificationPermission();
    void loadNotifications();
  }, [user, loadNotifications]);

  useEffect(() => {
    if (!user) return;

    let cleanup: (() => void) | undefined;

    const handleNotification = (payload: AppNotificationPayload) => {
      const incoming = payloadToNotification(payload);
      setNotifications((prev) => {
        const without = prev.filter((n) => n.id !== incoming.id);
        return [incoming, ...without].slice(0, 50);
      });
      showNativeNotification(payload);
      setToast(payload);
      window.setTimeout(() => setToast(null), 8000);
    };

    void startNotificationConnection(handleNotification, setSignalRStatus).then((stop) => {
      cleanup = stop;
    });

    return () => cleanup?.();
  }, [user]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) void loadNotifications();
  };

  const handleSelect = async (notification: AppNotification) => {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      try {
        await eventsApi.markNotificationRead(notification.id);
      } catch {
        /* keep optimistic UI */
      }
    }

    setOpen(false);
    if (notification.linkUrl?.startsWith('/')) {
      navigate(notification.linkUrl);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await eventsApi.markAllNotificationsRead();
    } catch {
      void loadNotifications();
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="notification-bell-wrap" ref={panelRef}>
        <button
          type="button"
          className="notification-bell-btn"
          onClick={handleOpen}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          aria-expanded={open}
          aria-haspopup="true"
        >
          <span className="notification-bell-icon" aria-hidden="true">🔔</span>
          {unreadCount > 0 && (
            <span className="notification-bell-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span
            className={`notification-bell-live notification-bell-live-${signalRStatus}`}
            title={`Live updates: ${signalRStatus}`}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div className="notification-panel" role="menu">
            <div className="notification-panel-header">
              <strong>Notifications</strong>
              {unreadCount > 0 && (
                <button type="button" className="notification-mark-all" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              )}
            </div>

            <div className="notification-panel-body">
              {loading ? (
                <p className="notification-empty">Loading…</p>
              ) : notifications.length === 0 ? (
                <p className="notification-empty">No notifications yet.</p>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    role="menuitem"
                    className={`notification-item${notification.isRead ? '' : ' unread'}`}
                    onClick={() => void handleSelect(notification)}
                  >
                    <span className="notification-item-icon" aria-hidden="true">
                      {CATEGORY_ICONS[notification.category] ?? '🔔'}
                    </span>
                    <span className="notification-item-content">
                      <span className="notification-item-title">{notification.title}</span>
                      <span className="notification-item-message">{notification.message}</span>
                      <span className="notification-item-meta">
                        {notification.category} · {formatWhen(notification.sentAt)}
                      </span>
                    </span>
                    {!notification.isRead && <span className="notification-unread-dot" aria-hidden="true" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="toast-container notification-toast" aria-live="polite">
          <div className="toast toast-info">
            <div className="toast-content">
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
              <span className="toast-category">{toast.category}</span>
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
