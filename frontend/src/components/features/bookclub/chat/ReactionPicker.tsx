import React, { useState, useRef, useEffect, useLayoutEffect, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { BsEmojiSmile } from 'react-icons/bs';
import { FiPlus } from 'react-icons/fi';

// Lazy: only fetches emoji-mart (~500KB) the first time a user clicks
// "More emojis" on any message. The quick-pick grid never needs it.
const FullEmojiPicker = lazy(() => import('./FullEmojiPicker'));

const QUICK_EMOJIS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🔥',
  '🎉', '👏', '🤔', '💯', '✅', '❌', '👀', '🙌',
  '💪', '🤝', '📚', '⭐',
];

// Two widths: a compact quick-pick row (5 cols of 20 emojis + "More")
// and a wider one when the full emoji-mart picker is expanded.
const QUICK_W = 200;
const FULL_W = 360;
// Rough min space needed to comfortably show the picker below the trigger.
// Used ONLY to decide flip direction — never as a positioning offset, so the
// real dropdown height can vary without throwing off alignment.
const FLIP_THRESHOLD = 140;

const ReactionPicker = ({ onSelectEmoji, position = 'top', currentUserEmoji = null, isOwn = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Toggles the dropdown between the quick-pick row and the full
  // emoji-mart picker (~1800 emojis with search + categories).
  const [showAll, setShowAll] = useState(false);
  // Fixed-position coords measured from the trigger button. `top` is set when
  // opening below; `bottom` is set when opening above. Using CSS `bottom` for
  // the above case means we don't need to know the dropdown's real height —
  // the browser anchors its bottom edge to the value, height grows upward.
  const [coords, setCoords] = useState<
    { left: number; top: number; bottom?: never } |
    { left: number; bottom: number; top?: never } |
    null
  >(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Compute portal coords: pin dropdown to the trigger button using viewport
  // coords (position: fixed). Auto-flip above/below based on available space,
  // and clamp horizontally so it doesn't spill off-screen. Width depends on
  // whether the full emoji-mart picker is expanded (~360 vs 200 for quick).
  const reposition = () => {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const preferBelow = position === 'bottom';
    const openBelow = preferBelow
      ? spaceBelow >= FLIP_THRESHOLD || r.top < FLIP_THRESHOLD
      : !(r.top >= FLIP_THRESHOLD) && spaceBelow >= FLIP_THRESHOLD;

    const width = showAll ? FULL_W : QUICK_W;
    let left = isOwn ? r.right - width : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    if (openBelow) {
      setCoords({ left, top: r.bottom + 8 });
    } else {
      setCoords({ left, bottom: window.innerHeight - r.top + 8 });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recompute coords whenever the picker opens, the user toggles between
  // quick / full mode (width changes), or the page scrolls / resizes.
  useLayoutEffect(() => {
    if (!isOpen) return;
    reposition();
    const onChange = () => reposition();
    window.addEventListener('scroll', onChange, true); // capture: catch all scroll containers
    window.addEventListener('resize', onChange);
    return () => {
      window.removeEventListener('scroll', onChange, true);
      window.removeEventListener('resize', onChange);
    };
  }, [isOpen, showAll]);

  // Reset to quick-pick view whenever the picker closes — otherwise
  // re-opening it on a different message would jump straight into the
  // full picker, surprising the user.
  useEffect(() => {
    if (!isOpen) setShowAll(false);
  }, [isOpen]);

  const handleSelect = (emoji: string) => {
    onSelectEmoji(emoji, emoji === currentUserEmoji);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 rounded-lg bg-gray-700/80 hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Add reaction"
      >
        <BsEmojiSmile className="w-3.5 h-3.5 text-gray-300" />
      </button>

      {/* Portalled to <body> so message images / sibling bubbles' stacking
          contexts can never paint above the dropdown. Uses fixed position
          calculated from the trigger button rect. The `warm-theme` class
          is re-applied here because the portal lands outside the bookclub
          interior's scope — without it the dropdown would fall back to
          default Tailwind grays and look out of place. */}
      {isOpen && coords && createPortal(
        <div className="warm-theme">
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              left: coords.left,
              width: showAll ? FULL_W : QUICK_W,
              ...('top' in coords ? { top: coords.top } : { bottom: coords.bottom }),
            }}
            className="z-[300] bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {showAll ? (
              // Full emoji-mart picker — ~1800 emojis with category tabs,
              // search, and frequently-used row. Lazy-loaded: the heavy
              // bundle only downloads on first "More emojis" click ever.
              // Suspense fallback shows a brief spinner during fetch.
              <Suspense
                fallback={
                  <div className="flex justify-center items-center h-40 w-full">
                    <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                  </div>
                }
              >
                <FullEmojiPicker onSelect={handleSelect} />
              </Suspense>
            ) : (
              <>
                <div className="grid grid-cols-5 gap-0.5">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSelect(emoji)}
                      className={`text-base p-1 rounded transition-colors flex items-center justify-center ${
                        emoji === currentUserEmoji
                          ? 'bg-indigo-700/40 ring-1 ring-indigo-500'
                          : 'hover:bg-gray-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {/* "More" affordance — opens the full emoji catalogue.
                    Sits as a separate row so it's discoverable, not
                    hidden as a 21st grid cell. */}
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="mt-1.5 w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                >
                  <FiPlus size={11} />
                  More emojis
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ReactionPicker;
