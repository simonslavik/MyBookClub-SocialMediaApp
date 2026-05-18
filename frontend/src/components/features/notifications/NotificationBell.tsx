import { useState, useEffect, useRef, useContext, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiCheckCircle, FiX } from 'react-icons/fi';
import { AuthContext } from '@context/index';
import apiClient from '@api/axios';
import logger from '@utils/logger';

const NOTIFICATION_WS_URL = import.meta.env.VITE_NOTIFICATION_WS_URL || 'ws://localhost:3005/ws';

const NOTIFICATION_ICONS = {
  meeting_created: '📅',
  meeting_updated: '📝',
  meeting_cancelled: '❌',
  meeting_reminder_24h: '📅',
  meeting_reminder_1h: '⏰',
  meeting_meeting_starting: '🚀',
};

const NotificationBell = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  // Position of the desktop dropdown — measured from the bell trigger so the
  // portal lands directly under it. On mobile the dropdown switches to a
  // full-width bottom sheet (handled in JSX), so coords are unused there.
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/v1/notifications/unread-count');
      if (data.success) {
        setUnreadCount(data.count);
      }
    } catch (err) {
      logger.error('Failed to fetch notification unread count:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/notifications?limit=20');
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      logger.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count on mount
  useEffect(() => {
    if (!auth?.token) return;
    fetchUnreadCount();
  }, [auth?.token, fetchUnreadCount]);

  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!auth?.token) return;

    let unmounted = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 10;

    const getReconnectDelay = () => {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) + Math.random() * 1000;
      reconnectAttempts++;
      return delay;
    };

    const connect = () => {
      if (unmounted) return;
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        logger.error('Notification WS: max reconnection attempts reached');
        return;
      }

      try {
        const ws = new WebSocket(NOTIFICATION_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          logger.debug('Notification WS connected');
          reconnectAttempts = 0; // Reset on successful connection
          // Authenticate
          ws.send(JSON.stringify({ type: 'auth', token: auth.token }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'auth-success') {
              logger.debug('Notification WS authenticated');
              return;
            }

            if (data.type === 'auth-error') {
              logger.error('Notification WS auth error:', data.message);
              return;
            }

            if (data.type === 'notification') {
              // New notification received in real-time
              setNotifications(prev => [data.data, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
          } catch (err) {
            logger.error('Notification WS parse error:', err);
          }
        };

        ws.onclose = () => {
          if (!unmounted) {
            const delay = getReconnectDelay();
            logger.debug(`Notification WS disconnected, reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            reconnectTimerRef.current = setTimeout(connect, delay);
          }
        };

        ws.onerror = (err) => {
          logger.error('Notification WS error:', err);
        };
      } catch (err) {
        logger.error('Notification WS connect error:', err);
        if (!unmounted) {
          const delay = getReconnectDelay();
          reconnectTimerRef.current = setTimeout(connect, delay);
        }
      }
    };

    connect();

    return () => {
      unmounted = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [auth?.token]);

  // Close dropdown when clicking outside. Both panels (desktop + mobile)
   // are rendered to the DOM with `hidden sm:flex` / `sm:hidden`, so a
   // shared React ref can only point to one of them — the other panel
   // would be treated as "outside" and clicks on it would close the
   // dropdown unexpectedly. Mark both panels with a data attribute and
   // check via `closest()` instead so either is recognised.
  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (target.closest('[data-notification-panel]')) return;
      setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  // Close on Escape, recompute position on scroll/resize so the desktop
   // dropdown stays glued under the bell even as the page shifts.
  useEffect(() => {
    if (!showDropdown) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDropdown(false); };
    const reposition = () => {
      if (triggerRef.current) setAnchorRect(triggerRef.current.getBoundingClientRect());
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [showDropdown]);

  // Measure trigger position the moment the dropdown opens so the portal
   // has fresh coords for the first paint (no flash at 0,0).
  useLayoutEffect(() => {
    if (showDropdown && triggerRef.current) {
      setAnchorRect(triggerRef.current.getBoundingClientRect());
    }
  }, [showDropdown]);

  const handleToggle = () => {
    if (!showDropdown) {
      fetchNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await apiClient.patch(`/v1/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      logger.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch('/v1/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      logger.error('Failed to mark all notifications read:', err);
    }
  };

  const handleDismiss = async (id, e) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/v1/notifications/${id}`);
      const dismissed = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (dismissed && !dismissed.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      logger.error('Failed to dismiss notification:', err);
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read) {
      apiClient.patch(`/v1/notifications/${notification.id}/read`).catch(() => {});
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate to the bookclub if we have a clubId
    if (notification.clubId) {
      navigate(`/bookclub/${notification.clubId}`);
      setShowDropdown(false);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (!auth?.user) return null;

  // Width of the desktop dropdown panel; the trigger-relative coords below
   // use it to right-align the panel with the bell.
  const PANEL_W = 380;

  return (
    <>
      {/* Bell trigger */}
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="relative p-2 text-stone-700 dark:text-gray-300 rounded-lg hover:bg-stone-100 dark:hover:bg-gray-700 transition cursor-pointer"
        aria-label="Notifications"
      >
        <FiBell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] items-center justify-center font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Portal — desktop card anchored to bell, mobile sheet at viewport bottom */}
      {showDropdown && createPortal(
        <>
          {/* Mobile-only backdrop. On desktop the click-outside listener
              + tiny drop shadow are enough; no full backdrop, so the page
              behind stays readable. */}
          <div
            className="fixed inset-0 z-[190] sm:hidden bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setShowDropdown(false)}
          />

          <div
            data-notification-panel
            style={
              anchorRect
                ? {
                    // Desktop: pin to bell. Clamp left so the panel never
                    // spills past the viewport right edge.
                    top: anchorRect.bottom + 8,
                    left: Math.max(8, Math.min(window.innerWidth - PANEL_W - 8, anchorRect.right - PANEL_W)),
                    width: PANEL_W,
                  }
                : undefined
            }
            className="fixed z-[200] hidden sm:flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 max-h-[min(560px,calc(100vh-100px))] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150"
          >
            <NotificationPanelContent
              loading={loading}
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={handleMarkAllRead}
              onItemClick={handleNotificationClick}
              onMarkRead={handleMarkRead}
              onDismiss={handleDismiss}
              timeAgo={timeAgo}
            />
          </div>

          {/* Mobile sheet */}
          <div
            data-notification-panel
            className="fixed sm:hidden left-0 right-0 bottom-0 z-[200] flex flex-col bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          >
            {/* Drag handle visual cue */}
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <span className="w-9 h-1 rounded-full bg-stone-300 dark:bg-gray-600" />
            </div>
            <NotificationPanelContent
              loading={loading}
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={handleMarkAllRead}
              onItemClick={handleNotificationClick}
              onMarkRead={handleMarkRead}
              onDismiss={handleDismiss}
              timeAgo={timeAgo}
              onClose={() => setShowDropdown(false)}
              showClose
            />
          </div>
        </>,
        document.body
      )}
    </>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// Panel content — shared between desktop card + mobile sheet so the design
// stays in sync. Renders header, list, items, empty state.
// ──────────────────────────────────────────────────────────────────────────
const NotificationPanelContent = ({
  loading, notifications, unreadCount,
  onMarkAllRead, onItemClick, onMarkRead, onDismiss, timeAgo,
  onClose, showClose = false,
}: any) => (
  <>
    {/* Header */}
    <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-100 dark:border-gray-800 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Notifications</h2>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FiCheckCircle size={13} />
            Mark all read
          </button>
        )}
        {showClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        )}
      </div>
    </header>

    {/* List */}
    <div className="flex-1 min-h-0 overflow-y-auto">
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin" />
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-12 px-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <FiBell className="text-stone-400 dark:text-stone-500" size={20} />
          </div>
          <p className="text-sm font-medium text-stone-700 dark:text-stone-200">You're all caught up</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">New notifications will appear here.</p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <ul className="divide-y divide-stone-100 dark:divide-gray-800">
          {notifications.map((n: any) => {
            const icon = NOTIFICATION_ICONS[n.type] || '🔔';
            return (
              <li
                key={n.id}
                onClick={() => onItemClick(n)}
                className={`relative px-4 py-3 cursor-pointer transition-colors hover:bg-stone-50 dark:hover:bg-gray-800/60 ${
                  !n.read ? 'bg-stone-50/60 dark:bg-gray-800/30' : ''
                }`}
              >
                {/* Unread accent bar — runs full height of the row */}
                {!n.read && (
                  <span aria-hidden className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-red-500" />
                )}

                <div className="flex items-start gap-3 pl-1">
                  {/* Type icon avatar */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center text-base">
                    {icon}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-stone-900 dark:text-stone-100' : 'text-stone-700 dark:text-stone-300'}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    )}
                    <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1.5">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {/* Actions — always visible (not opacity-0 hover-only, so
                      mobile users can actually use them). */}
                  <div className="flex items-center gap-0.5 flex-shrink-0 -mt-0.5">
                    {!n.read && (
                      <button
                        onClick={(e) => onMarkRead(n.id, e)}
                        className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md transition-colors"
                        title="Mark as read"
                      >
                        <FiCheck size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => onDismiss(n.id, e)}
                      className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                      title="Dismiss"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  </>
);

export default NotificationBell;
