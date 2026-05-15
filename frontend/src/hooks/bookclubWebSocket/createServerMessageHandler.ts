import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import logger from '@utils/logger';
import type { ChatMessage, ConnectedUser, ServerMessage } from './types';
import { applyServerMessageToMessages } from './messageReducer';

interface Handlers {
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setHasMoreMessages: (v: boolean) => void;
  setConnectedUsers: Dispatch<SetStateAction<ConnectedUser[]>>;
  setBookClubMembers: (v: ConnectedUser[]) => void;
  setUnreadRooms: Dispatch<SetStateAction<Set<string>>>;
  setUnreadSections: Dispatch<SetStateAction<Set<string>>>;
  setLastReadAt: (v: string | null) => void;
  setLoadingOlder: (v: boolean) => void;
  noteTyping: (userId: string, username: string) => void;
  currentRoomIdRef: MutableRefObject<string | null>;
  toastError: (msg: string) => void;
  onInit?: (payload: { rooms: any[]; userRole: string | null }) => void;
}

/**
 * Builds the `onmessage` handler for the bookclub WebSocket.
 *
 * Centralised so the WS hook reads as connection-lifecycle code; the
 * payload-by-payload state mutations live here.
 */
export function createServerMessageHandler(handlers: Handlers) {
  return (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as ServerMessage;

      // Pure transformation of the messages array.
      handlers.setMessages((prev) => applyServerMessageToMessages(prev, data));

      // Side-effects on the other state slices.
      switch (data.type) {
        case 'init':
          handlers.setHasMoreMessages(data.hasMore || false);
          handlers.setConnectedUsers(data.users || []);
          if (data.members) handlers.setBookClubMembers(data.members);
          handlers.setUnreadRooms(
            data.unreadRoomIds && data.unreadRoomIds.length > 0
              ? new Set(data.unreadRoomIds)
              : new Set(),
          );
          handlers.setLastReadAt(data.lastReadAt || null);
          handlers.setUnreadSections(
            data.unreadSections && data.unreadSections.length > 0
              ? new Set(data.unreadSections)
              : new Set(),
          );
          handlers.onInit?.({
            rooms: data.bookClub?.rooms || [],
            userRole: data.userRole || null,
          });
          break;

        case 'user-joined':
          handlers.setConnectedUsers((prev) =>
            prev.find((u) => u.id === data.user.id) ? prev : [...prev, data.user],
          );
          if (data.members) handlers.setBookClubMembers(data.members);
          break;

        case 'user-left':
          handlers.setConnectedUsers((prev) => prev.filter((u) => u.id !== data.userId));
          break;

        case 'room-switched':
          handlers.setUnreadRooms((prev) => {
            const next = new Set(prev);
            next.delete(data.roomId || handlers.currentRoomIdRef.current);
            return next;
          });
          handlers.setLastReadAt(data.lastReadAt || null);
          handlers.setHasMoreMessages(data.hasMore || false);
          break;

        case 'older-messages':
          handlers.setLoadingOlder(false);
          handlers.setHasMoreMessages(data.hasMore || false);
          break;

        case 'error':
          logger.error('WebSocket error:', data.message);
          handlers.toastError(data.message);
          break;

        case 'room-activity':
          if (data.roomId && data.roomId !== handlers.currentRoomIdRef.current) {
            handlers.setUnreadRooms((prev) => new Set(prev).add(data.roomId));
          }
          break;

        case 'section-activity':
          if (data.section) {
            handlers.setUnreadSections((prev) => new Set([...prev, data.section]));
          }
          break;

        case 'typing':
          handlers.noteTyping(data.userId, data.username);
          break;

        // chat-message / reaction-updated / message-edited are handled
        // entirely by the messages reducer above — no side-effects here.
        default:
          break;
      }
    } catch (err) {
      logger.error('Error processing WebSocket message:', err);
    }
  };
}
