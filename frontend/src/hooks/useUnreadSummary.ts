import { useCallback, useEffect, useState } from 'react';
import apiClient from '@api/axios';
import logger from '@utils/logger';

const POLL_INTERVAL_MS = 60_000;

export interface ClubUnread {
  clubId: string;
  unreadMessageCount: number;
  unreadSections: string[]; // 'books' | 'suggestions' | 'meetings' | 'calendar'
  hasUnread: boolean;
}

/**
 * Fetches per-bookclub unread badges for the sidebar.
 *
 * Refetch triggers:
 *   - mount
 *   - tab gains focus (user came back to the app)
 *   - every {@link POLL_INTERVAL_MS} while idle
 *   - manual `refresh()` call (e.g. after the user enters a club, so its
 *     bubble clears immediately instead of waiting for the next poll)
 *
 * Returns a Map keyed by clubId for O(1) lookup in render.
 */
export function useUnreadSummary(authToken?: string | null) {
  const [summary, setSummary] = useState<Map<string, ClubUnread>>(new Map());

  const refresh = useCallback(async () => {
    if (!authToken) {
      setSummary(new Map());
      return;
    }
    try {
      const { data } = await apiClient.get('/v1/bookclubs/unread-summary');
      const list: ClubUnread[] = data?.summary || [];
      setSummary(new Map(list.map(s => [s.clubId, s])));
    } catch (err) {
      // Soft-fail: badges are nice-to-have, not critical.
      logger.warn('Failed to fetch unread summary:', err);
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;

    refresh();

    const onFocus = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', refresh);

    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', refresh);
      clearInterval(interval);
    };
  }, [authToken, refresh]);

  /**
   * Optimistically zero out a club's badge — used when the user navigates
   * into a bookclub so the dot disappears without waiting for the next poll
   * to confirm the server-side mark-as-read.
   */
  const clearClub = useCallback((clubId: string) => {
    setSummary(prev => {
      if (!prev.has(clubId)) return prev;
      const next = new Map(prev);
      next.set(clubId, { clubId, unreadMessageCount: 0, unreadSections: [], hasUnread: false });
      return next;
    });
  }, []);

  return { summary, refresh, clearClub };
}
