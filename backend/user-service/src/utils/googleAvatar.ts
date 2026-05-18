/**
 * Detect Google's auto-generated "default" / "initials" avatar URLs.
 *
 * Google's OpenID `picture` field is populated whether or not the user
 * has uploaded a real photo. When they haven't, Google returns a URL
 * pointing at an auto-generated monogram (e.g. "AS" on a coloured
 * background). We don't want to store those — the app already renders
 * its own SVG avatar fallback that matches the brand. Storing the
 * Google one means users without a real photo see Google's monogram
 * instead, which looks out of place.
 *
 * There's no perfect detection (Google doesn't flag default avatars in
 * the basic ID token — only the People API exposes `photos[].default`).
 * The heuristics below cover the URL patterns observed in production
 * across most accounts:
 *
 *   1. Path contains `/a/default-user`         — old-style default
 *   2. URL has `=mo` or `=k-no` query suffix   — "monogram" / "no photo" modes
 *   3. Path segment after `/a/` is too short   — defaults use short hashes,
 *      real photos use 30+ char content IDs (often starting with ACg8oc)
 *
 * False positives (treating a real photo as a default) are conservative:
 * the worst case is the user loses their Google photo and falls back to
 * the in-app generated avatar — they can always upload one manually.
 * False negatives (treating a default as a real photo) preserve the
 * status quo: the user keeps seeing Google's monogram. So we err on the
 * side of more aggressive detection.
 */
export const isGoogleDefaultAvatar = (url: string | null | undefined): boolean => {
  if (!url) return false;

  // Only inspect Google-hosted URLs — leave anything else alone.
  if (!/googleusercontent\.com\//i.test(url)) return false;

  // (1) Old-style "no photo" path.
  if (/\/a\/default-user/i.test(url)) return true;

  // (2) Monogram / no-photo mode markers in the size param.
  if (/=mo(\b|=|&|$)/i.test(url) || /=k-no(\b|=|&|$)/i.test(url)) return true;

  // (3) Short path segment after /a/ or /a-/. Real Google photo IDs are
  // ~28-44 chars and usually start with "ACg8oc" or "AAAA". Defaults
  // use shorter hashes (sometimes just initials).
  const pathMatch = url.match(/\/a-?\/([^=?\/\s]+)/);
  if (pathMatch) {
    const segment = pathMatch[1];
    // Real content IDs are ≥ 20 chars and start with capital A.
    const looksLikeRealId = segment.length >= 20 && /^A[A-Za-z0-9]/.test(segment);
    if (!looksLikeRealId) return true;
  }

  return false;
};

/**
 * Normalize a Google `picture` value: return the URL if it looks like a
 * real photo, or `null` if it looks like a default monogram.
 */
export const normalizeGooglePicture = (picture: string | null | undefined): string | null => {
  if (!picture) return null;
  return isGoogleDefaultAvatar(picture) ? null : picture;
};
