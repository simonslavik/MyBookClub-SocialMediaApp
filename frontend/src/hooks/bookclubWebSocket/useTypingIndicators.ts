import { useCallback, useEffect, useRef, useState } from 'react';

const TYPING_TIMEOUT_MS = 3000;

/**
 * Tracks which other users are currently typing in the active room.
 *
 * Each `note(userId, username)` call shows the user as typing and (re)arms
 * a per-user timer that removes them after `TYPING_TIMEOUT_MS` of silence.
 * `reset()` clears every user and timer — used when switching rooms.
 */
export function useTypingIndicators(currentUserId?: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const reset = useCallback(() => {
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
    setTypingUsers([]);
  }, []);

  const note = useCallback((userId: string, username: string) => {
    if (!userId || userId === currentUserId) return;

    setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));

    if (timersRef.current[userId]) clearTimeout(timersRef.current[userId]);
    timersRef.current[userId] = setTimeout(() => {
      setTypingUsers((prev) => prev.filter((u) => u !== username));
      delete timersRef.current[userId];
    }, TYPING_TIMEOUT_MS);
  }, [currentUserId]);

  useEffect(() => () => {
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
  }, []);

  return { typingUsers, noteTyping: note, resetTyping: reset };
}
