import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const socketRef = useRef(null);

  const isPlayer = Boolean(user) && user.role !== 'ADMIN' && user.role !== 'CLUB_MANAGER';

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.get('/notifications?limit=30');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // A failed poll must not break the page
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    load();
  }, [user, load]);

  // Live delivery into the player's private room
  useEffect(() => {
    if (!user) return undefined;

    const token = localStorage.getItem('token');
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('player:join', token));
    socket.on('notification:new', ({ notification, unreadCount: count }) => {
      setNotifications((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)].slice(0, 30));
      setUnreadCount(count);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // Reflect an existing browser subscription
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushEnabled(Boolean(sub)))
      .catch(() => setPushEnabled(false));
  }, []);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      load();
    }
  }, [load]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.patch('/notifications/read-all');
    } catch {
      load();
    }
  }, [load]);

  const remove = useCallback(async (id) => {
    const removed = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (removed && !removed.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      load();
    }
  }, [notifications, load]);

  const enablePush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('This browser does not support push notifications');
    }

    const { configured, publicKey } = await api.get('/notifications/push/public-key');
    if (!configured) throw new Error('Push notifications are not configured on this environment');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission was declined');

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = sub.toJSON();
    await api.post('/notifications/push/subscribe', {
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    });
    setPushEnabled(true);
  }, []);

  const disablePush = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api.post('/notifications/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe();
    }
    setPushEnabled(false);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, loading, isPlayer,
      pushEnabled, enablePush, disablePush,
      reload: load, markRead, markAllRead, remove,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
