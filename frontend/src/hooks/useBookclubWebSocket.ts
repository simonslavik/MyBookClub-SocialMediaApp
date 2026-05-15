import { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { WS_URL } from '@config/constants';
import logger from '@utils/logger';
import UIFeedbackContext from '@context/UIFeedbackContext';
import type { ChatMessage, ConnectedUser } from './bookclubWebSocket/types';
import { useTypingIndicators } from './bookclubWebSocket/useTypingIndicators';
import { createServerMessageHandler } from './bookclubWebSocket/createServerMessageHandler';

const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_RECONNECT_BACKOFF_MS = 30_000;

export const useBookclubWebSocket = (
  bookClub,
  currentRoom,
  auth,
  bookClubId,
  { onInit }: { onInit?: (...args: any[]) => void } = {},
) => {
  const ws = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [bookClubMembers, setBookClubMembers] = useState<ConnectedUser[]>([]);
  const [unreadRooms, setUnreadRooms] = useState<Set<string>>(new Set());
  const [unreadSections, setUnreadSections] = useState<Set<string>>(new Set());
  const [lastReadAt, setLastReadAt] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const { toastError } = useContext(UIFeedbackContext);
  const { typingUsers, noteTyping, resetTyping } = useTypingIndicators(auth?.user?.id);

  // Lifecycle bookkeeping refs
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntentionalCloseRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const currentRoomIdRef = useRef<string | null>(null);
  const currentBookClubIdRef = useRef<string | null>(null);

  // Always-current refs so callbacks/cleanups read fresh values without re-binding
  const onInitRef = useRef(onInit);
  onInitRef.current = onInit;
  const currentRoomPropRef = useRef(currentRoom);
  currentRoomPropRef.current = currentRoom;
  const bookClubIdPropRef = useRef(bookClubId);
  bookClubIdPropRef.current = bookClubId;

  useEffect(() => {
    if (!bookClub || !auth?.token) return;

    // Section view (no room selected) — keep the existing socket alive
    // so section-activity events still arrive.
    if (!currentRoom) return;

    // Same bookclub, different room → switch via message instead of reconnecting.
    const isSameBookClub = currentBookClubIdRef.current === bookClubId;
    const isRoomSwitch =
      isSameBookClub && currentRoomIdRef.current !== currentRoom.id;

    if (isRoomSwitch && ws.current?.readyState === WebSocket.OPEN) {
      logger.debug('🔄 Switching room from', currentRoomIdRef.current, 'to', currentRoom.id);
      currentRoomIdRef.current = currentRoom.id;
      resetTyping();
      ws.current.send(JSON.stringify({
        type: 'switch-room',
        roomId: currentRoom.id,
        userId: auth.user.id,
        username: auth.user.name || 'Anonymous',
      }));
      return;
    }

    // Otherwise we need a new socket (different bookclub, or no live connection).
    logger.debug('Establishing new WebSocket connection for bookclub:', bookClubId);
    isIntentionalCloseRef.current = false;

    const onMessage = createServerMessageHandler({
      setMessages,
      setHasMoreMessages,
      setConnectedUsers,
      setBookClubMembers,
      setUnreadRooms,
      setUnreadSections,
      setLastReadAt,
      setLoadingOlder,
      noteTyping,
      currentRoomIdRef,
      toastError,
      onInit: (payload) => onInitRef.current?.(payload),
    });

    const connect = () => {
      logger.debug('Attempting to connect WebSocket to:', WS_URL);
      const socket = new WebSocket(WS_URL);
      ws.current = socket;

      socket.onopen = () => {
        logger.debug('✅ WebSocket connected to bookclub:', bookClubId);
        reconnectAttemptsRef.current = 0;

        // Bail out if a newer effect run replaced this socket while we were connecting.
        if (ws.current !== socket) {
          logger.debug('Socket replaced, closing old connection');
          socket.close();
          return;
        }

        currentRoomIdRef.current = currentRoom.id;
        currentBookClubIdRef.current = bookClubId;
        socket.send(JSON.stringify({
          type: 'join',
          bookClubId,
          userId: auth.user.id,
          username: auth.user.name || 'Anonymous',
          profileImage: auth.user.profileImage || null,
          roomId: currentRoom.id,
          token: auth.token,
        }));
      };

      socket.onmessage = onMessage;
      socket.onerror = (err) => logger.error('❌ WebSocket error:', err);

      socket.onclose = (event) => {
        logger.debug('📪 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);

        if (ws.current === socket) ws.current = null;

        if (isIntentionalCloseRef.current || ws.current !== null) return;

        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          logger.error('🔌 Max reconnection attempts reached, giving up');
          toastError('Connection lost. Please refresh the page.');
          return;
        }

        const baseDelay = Math.min(
          1000 * 2 ** reconnectAttemptsRef.current,
          MAX_RECONNECT_BACKOFF_MS,
        );
        const delay = baseDelay + Math.random() * 1000;
        reconnectAttemptsRef.current += 1;
        logger.debug(
          `🔄 Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})…`,
        );
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      // If the user just navigated to a section view (currentRoom → null)
      // within the same bookclub, keep the WebSocket alive.
      if (
        currentRoomPropRef.current === null &&
        bookClubIdPropRef.current === currentBookClubIdRef.current
      ) {
        logger.debug('📌 Cleanup skipped — staying in same bookclub (section view)');
        return;
      }

      isIntentionalCloseRef.current = true;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (ws.current) {
        const state = ws.current.readyState;
        if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
          ws.current.close();
        }
        ws.current = null;
      }

      currentRoomIdRef.current = null;
      currentBookClubIdRef.current = null;
    };
  }, [bookClubId, currentRoom?.id, auth?.token]);

  // ── Send helpers ────────────────────────────────────────────
  const sendTyping = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'typing' }));
    }
  }, []);

  const viewSection = useCallback((section: string) => {
    setUnreadSections((prev) => {
      const next = new Set(prev);
      next.delete(section);
      return next;
    });
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'view-section', section }));
    }
  }, []);

  const notifySectionActivity = useCallback((section: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'section-activity', section }));
    }
  }, []);

  const loadOlderMessages = useCallback(() => {
    if (
      !ws.current ||
      ws.current.readyState !== WebSocket.OPEN ||
      loadingOlder ||
      !hasMoreMessages
    ) {
      return;
    }
    setLoadingOlder(true);
    setMessages((current) => {
      if (current.length === 0) return current;
      const oldest = current[0];
      ws.current!.send(JSON.stringify({
        type: 'load-older-messages',
        before: oldest.timestamp,
        limit: 50,
      }));
      return current;
    });
  }, [loadingOlder, hasMoreMessages]);

  return {
    ws,
    messages,
    setMessages,
    connectedUsers,
    setConnectedUsers,
    bookClubMembers,
    setBookClubMembers,
    unreadRooms,
    setUnreadRooms,
    unreadSections,
    viewSection,
    notifySectionActivity,
    lastReadAt,
    hasMoreMessages,
    loadingOlder,
    loadOlderMessages,
    typingUsers,
    sendTyping,
  };
};
