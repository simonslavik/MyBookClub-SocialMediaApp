import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { BsEmojiSmile } from 'react-icons/bs';

// Lazy: defer emoji-mart (~500KB) until the user clicks the smiley
// icon for the first time. Composer renders instantly without it.
const FullEmojiPicker = lazy(() => import('./FullEmojiPicker'));

/**
 * EmojiPickerButton — a button that opens a full emoji picker (emoji-mart).
 * Inserts the selected emoji into the message text at the cursor position.
 *
 * Props:
 *  - onEmojiSelect: (emoji: string) => void — called with the emoji native character
 */
const EmojiPickerButton = ({ onEmojiSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (native: string) => {
    onEmojiSelect(native);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-gray-400 hover:text-gray-200 rounded-md hover:bg-gray-700 transition-colors"
        title="Add emoji"
      >
        <BsEmojiSmile className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 z-[70]">
          {/* Lazy-loaded emoji catalog. Spinner is brief — fetch is ~50-150ms
              on a modern connection, picker mounts straight after. */}
          <Suspense
            fallback={
              <div className="flex justify-center items-center h-40 w-72 bg-gray-800 rounded-lg border border-gray-700">
                <div className="w-5 h-5 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin" />
              </div>
            }
          >
            <FullEmojiPicker onSelect={handleSelect} perLine={8} />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default EmojiPickerButton;
