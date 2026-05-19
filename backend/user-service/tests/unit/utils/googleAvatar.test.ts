import { describe, it, expect } from '@jest/globals';
import {
  isGoogleDefaultAvatar,
  normalizeGooglePicture,
} from '../../../src/utils/googleAvatar.js';

/**
 * Tests for the Google default-avatar heuristics.
 *
 * The detection isn't perfect (Google doesn't expose a `default` flag
 * in the basic ID token), so these tests pin the BEHAVIOUR of the
 * heuristic — if a URL pattern we encounter in production needs to be
 * reclassified, add a case here first, then tweak the regex until it
 * lines up.
 */
describe('googleAvatar utils', () => {
  describe('isGoogleDefaultAvatar', () => {
    it('returns false for null / empty', () => {
      expect(isGoogleDefaultAvatar(null)).toBe(false);
      expect(isGoogleDefaultAvatar(undefined)).toBe(false);
      expect(isGoogleDefaultAvatar('')).toBe(false);
    });

    it('returns false for non-Google URLs (we leave them alone)', () => {
      expect(isGoogleDefaultAvatar('https://example.com/avatar.jpg')).toBe(false);
      expect(isGoogleDefaultAvatar('https://my-cdn.io/u/abc=s96-c')).toBe(false);
    });

    it('detects the legacy /a/default-user path', () => {
      expect(isGoogleDefaultAvatar('https://lh3.googleusercontent.com/a/default-user=s96-c')).toBe(true);
    });

    it('detects =mo (monogram) and =k-no suffixes', () => {
      expect(isGoogleDefaultAvatar('https://lh3.googleusercontent.com/a/AS=mo')).toBe(true);
      expect(isGoogleDefaultAvatar('https://lh3.googleusercontent.com/a/AS=k-no')).toBe(true);
    });

    it('treats short path segments as defaults', () => {
      // "AS" is only 2 chars — real Google content IDs are 28-44+ chars
      // starting with ACg8oc/AAAA — so we flag short IDs as defaults.
      expect(isGoogleDefaultAvatar('https://lh3.googleusercontent.com/a/AS=s96-c')).toBe(true);
      expect(isGoogleDefaultAvatar('https://lh3.googleusercontent.com/a/short_id=s96-c')).toBe(true);
    });

    it('preserves real photo URLs with long ACg8oc IDs', () => {
      // Real photos: ≥20 chars starting with capital A, often ACg8oc prefix.
      const realPhoto = 'https://lh3.googleusercontent.com/a/ACg8ocREAL_PHOTO_ID_LONG_ENOUGH=s96-c';
      expect(isGoogleDefaultAvatar(realPhoto)).toBe(false);
    });

    it('preserves real photo URLs with AAAA-style IDs', () => {
      const realPhoto = 'https://lh3.googleusercontent.com/a/AAAA1234567890_ALSO_LONG=s96-c';
      expect(isGoogleDefaultAvatar(realPhoto)).toBe(false);
    });

    it('handles the /a-/ path variant (older Google avatars)', () => {
      // Real ID under /a-/ should NOT be treated as default
      const realOldStyle = 'https://lh3.googleusercontent.com/a-/ACg8ocOLD_BUT_REAL_PHOTO_ID=s96-c';
      expect(isGoogleDefaultAvatar(realOldStyle)).toBe(false);

      // Short ID under /a-/ should still be treated as default
      const defaultOldStyle = 'https://lh3.googleusercontent.com/a-/AS=mo';
      expect(isGoogleDefaultAvatar(defaultOldStyle)).toBe(true);
    });
  });

  describe('normalizeGooglePicture', () => {
    it('returns null for null / undefined / empty input', () => {
      expect(normalizeGooglePicture(null)).toBeNull();
      expect(normalizeGooglePicture(undefined)).toBeNull();
      expect(normalizeGooglePicture('')).toBeNull();
    });

    it('returns null when the URL looks like a Google default', () => {
      expect(normalizeGooglePicture('https://lh3.googleusercontent.com/a/default-user=s96-c')).toBeNull();
      expect(normalizeGooglePicture('https://lh3.googleusercontent.com/a/AS=mo')).toBeNull();
    });

    it('returns the URL unchanged when it looks like a real photo', () => {
      const realPhoto = 'https://lh3.googleusercontent.com/a/ACg8ocLONG_REAL_PHOTO_ID_HERE=s96-c';
      expect(normalizeGooglePicture(realPhoto)).toBe(realPhoto);
    });

    it('returns non-Google URLs unchanged', () => {
      const customCdn = 'https://my-cdn.io/avatars/user123.jpg';
      expect(normalizeGooglePicture(customCdn)).toBe(customCdn);
    });
  });
});
