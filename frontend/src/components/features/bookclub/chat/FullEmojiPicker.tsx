import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

interface FullEmojiPickerProps {
  /** Called when user picks an emoji (native string passed through). */
  onSelect: (native: string) => void;
  /** Theme passed to emoji-mart. */
  theme?: 'dark' | 'light';
  /** Items per row. */
  perLine?: number;
  /** Tab nav position. */
  navPosition?: 'top' | 'bottom';
}

/**
 * Lazy wrapper around `emoji-mart` so its ~500KB / ~110KB-gzipped
 * bundle is only fetched when the user opens an emoji picker (chat
 * composer, reaction "More emojis"), never on page load.
 *
 * Consumers should import this with `React.lazy()`:
 *
 *   const FullEmojiPicker = lazy(() => import('./FullEmojiPicker'));
 *   <Suspense fallback={<Spinner/>}>
 *     {open && <FullEmojiPicker onSelect={...} />}
 *   </Suspense>
 *
 * Lazy gating moves emoji-mart out of the homepage's critical path,
 * which is the single biggest perf win available — first Lighthouse
 * pass put us at ~75 perf because we pulled the picker on every page
 * even when no one opened it.
 */
const FullEmojiPicker = ({
  onSelect,
  theme = 'dark',
  perLine = 8,
  navPosition = 'bottom',
}: FullEmojiPickerProps) => {
  return (
    <Picker
      data={data}
      onEmojiSelect={(emojiData: any) => onSelect(emojiData.native)}
      theme={theme}
      previewPosition="none"
      skinTonePosition="none"
      maxFrequentRows={1}
      perLine={perLine}
      navPosition={navPosition}
    />
  );
};

export default FullEmojiPicker;
