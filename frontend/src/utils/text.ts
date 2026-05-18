/**
 * Strip HTML tags from a string and decode common HTML entities.
 *
 * Used for book descriptions returned by the Google Books API — those
 * arrive as HTML strings (e.g. "<p><b>Kafka Tamura...</b><br><br>..."),
 * which React renders literally as text since we pass them as children
 * (and we do NOT want `dangerouslySetInnerHTML` on third-party content).
 *
 * This is a display-only sanitizer, not a security one — for true XSS
 * safety we still avoid `dangerouslySetInnerHTML`.
 */
export const stripHtml = (input?: string | null): string => {
  if (!input) return '';
  // Remove tags
  const noTags = input.replace(/<[^>]*>/g, ' ');
  // Decode the handful of entities Google Books actually returns
  const decoded = noTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
  // Collapse the whitespace that tag-removal leaves behind
  return decoded.replace(/\s+/g, ' ').trim();
};

/**
 * Strip HTML and truncate to a max char count, adding an ellipsis if
 * the input was longer. Use for card previews / line-clamp fallbacks.
 */
export const stripHtmlExcerpt = (input: string | null | undefined, max = 200): string => {
  const cleaned = stripHtml(input);
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max).trimEnd() + '…';
};
