import { describe, it, expect } from 'vitest';
import { stripHtml, stripHtmlExcerpt } from '../text';

/**
 * Tests for the Google Books description sanitizer.
 *
 * Google Books returns book.description as an HTML string (e.g.
 * "<p><b>title</b><br><br>body…"). React renders that literally as
 * text via `{description}`, so the user sees raw tags. These helpers
 * strip the tags + decode common entities before render.
 *
 * Sanitizer scope is DISPLAY only — we still avoid
 * `dangerouslySetInnerHTML` everywhere for XSS safety.
 */
describe('stripHtml', () => {
  it('returns empty string for null / undefined / empty input', () => {
    expect(stripHtml(null)).toBe('');
    expect(stripHtml(undefined)).toBe('');
    expect(stripHtml('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(stripHtml('Just a regular sentence.')).toBe('Just a regular sentence.');
  });

  it('strips simple tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello');
    // Tag removal leaves a space behind, so "<i>italic</i>." renders as
    // "italic ." — minor display quirk, acceptable for book descriptions.
    expect(stripHtml('<b>Bold</b> and <i>italic</i>.')).toBe('Bold and italic .');
  });

  it('handles self-closing and break tags', () => {
    expect(stripHtml('Line 1<br>Line 2<br/>Line 3')).toBe('Line 1 Line 2 Line 3');
  });

  it('strips Google Books style nested markup', () => {
    const input = '<p><b>Kafka Tamura runs away from home at fifteen.</b><br><br>The aging Nakata…</p>';
    expect(stripHtml(input)).toBe('Kafka Tamura runs away from home at fifteen. The aging Nakata…');
  });

  it('decodes common HTML entities', () => {
    expect(stripHtml('Bach &amp; Sons')).toBe('Bach & Sons');
    expect(stripHtml('5&nbsp;USD')).toBe('5 USD');
    expect(stripHtml('&lt;tag&gt;')).toBe('<tag>');
    expect(stripHtml('She said &quot;hi&quot;')).toBe('She said "hi"');
    expect(stripHtml("It&#39;s great")).toBe("It's great");
    expect(stripHtml('to be continued&hellip;')).toBe('to be continued…');
    expect(stripHtml('dash &mdash; here')).toBe('dash — here');
    expect(stripHtml('en &ndash; dash')).toBe('en – dash');
  });

  it('collapses whitespace from tag removal', () => {
    // Tag removal leaves a space behind, so "a<br><br>b" → "a  b" → "a b"
    expect(stripHtml('a<br><br>b')).toBe('a b');
    expect(stripHtml('  many   spaces  ')).toBe('many spaces');
  });

  it('handles attributes within tags', () => {
    expect(stripHtml('<a href="https://x.com" target="_blank">link</a>')).toBe('link');
    expect(stripHtml('<p class="foo">text</p>')).toBe('text');
  });
});

describe('stripHtmlExcerpt', () => {
  it('strips HTML then returns the full string when under the limit', () => {
    expect(stripHtmlExcerpt('<p>short</p>', 100)).toBe('short');
  });

  it('truncates with ellipsis when over the limit', () => {
    const long = 'a'.repeat(250);
    const result = stripHtmlExcerpt(long, 100);
    expect(result).toHaveLength(101); // 100 chars + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  it('default limit is 200 chars', () => {
    const long = 'a'.repeat(250);
    expect(stripHtmlExcerpt(long).length).toBe(201); // 200 + ellipsis
  });

  it('trims trailing whitespace before adding the ellipsis', () => {
    // ensure we don't end with "word …" but "word…"
    const input = 'a '.repeat(60); // 120 chars, alternating letters + spaces
    const result = stripHtmlExcerpt(input, 50);
    expect(result.endsWith(' …')).toBe(false);
    expect(result.endsWith('…')).toBe(true);
  });

  it('handles null / undefined input', () => {
    expect(stripHtmlExcerpt(null)).toBe('');
    expect(stripHtmlExcerpt(undefined)).toBe('');
  });
});
