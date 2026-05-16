import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { BsEmojiSmile } from 'react-icons/bs';

const QUICK_EMOJIS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🔥',
  '🎉', '👏', '🤔', '💯', '✅', '❌', '👀', '🙌',
  '💪', '🤝', '📚', '⭐',
];

const DROPDOWN_W = 200;
// Rough min space needed to comfortably show the picker below the trigger.
// Used ONLY to decide flip direction — never as a positioning offset, so the
// real dropdown height can vary without throwing off alignment.
const FLIP_THRESHOLD = 140;

const ReactionPicker = ({ onSelectEmoji, position = 'top', currentUserEmoji = null, isOwn = false }) => {
  const [isOpen, setIsOpen] = useState(false);
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
  // and clamp horizontally so it doesn't spill off-screen.
  const reposition = () => {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    // Prefer the orientation hinted by `position`, but flip if there isn't
    // enough room there and the other side has more.
    const preferBelow = position === 'bottom';
    const openBelow = preferBelow
      ? spaceBelow >= FLIP_THRESHOLD || r.top < FLIP_THRESHOLD
      : !(r.top >= FLIP_THRESHOLD) && spaceBelow >= FLIP_THRESHOLD;

    let left = isOwn ? r.right - DROPDOWN_W : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - DROPDOWN_W - 8));

    if (openBelow) {
      setCoords({ left, top: r.bottom + 8 });
    } else {
      // Anchor by `bottom` so the dropdown grows upward from its own height —
      // no need to know the real height ahead of time.
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

  // Recompute coords whenever the picker opens, and keep it pinned while the
  // chat list scrolls or the window resizes underneath.
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
              width: DROPDOWN_W,
              ...('top' in coords ? { top: coords.top } : { bottom: coords.bottom }),
            }}
            className="z-[300] bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-1.5"
            onClick={(e) => e.stopPropagation()}
          >
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
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ReactionPicker;
