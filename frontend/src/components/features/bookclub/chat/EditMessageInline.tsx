import { useEffect, useLayoutEffect, useRef } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';

interface EditMessageInlineProps {
  editInputRef: any;
  editingText: string;
  setEditingText: (s: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onCancelEdit: () => void;
  onEditSave: () => void;
}

/**
 * Inline editor that replaces an own-message bubble while the user is
 * editing. Three things this fixes vs. the old in-place edit UI:
 *
 *  1. Visual polish — clean stone card, monochrome Save button matching
 *     the rest of the app's design system (modals, CTAs). Old version
 *     was a dark gray-800 box with indigo Save button that felt left
 *     over from the original Discord-clone palette.
 *  2. Auto-grow textarea — height tracks content (1 → 6 rows) so long
 *     messages don't get cut off into a 120px scrolling box.
 *  3. Keyboard hint — small footer copy explains Enter to save, Esc to
 *     cancel so users don't have to discover it through experimentation.
 *
 * Scroll-into-view: on mount we call `scrollIntoView({ block: 'end' })`
 * on the wrapper so editing the LAST message doesn't hide the Save /
 * Cancel buttons behind the composer input. This was the second part of
 * the user complaint — without the scroll, clicking Edit on the bottom
 * message put the action buttons below the visible area.
 */
const EditMessageInline = ({
  editInputRef,
  editingText,
  setEditingText,
  onEditKeyDown,
  onCancelEdit,
  onEditSave,
}: EditMessageInlineProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Scroll the editing bubble (and its action buttons) fully into view
  // on mount. block: 'end' aligns the bottom edge with the viewport
  // bottom — exactly what we need so the Save / Cancel row clears the
  // chat composer.
  useLayoutEffect(() => {
    wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  // Auto-grow textarea height to fit content (1 → ~6 rows). Re-runs on
  // every keystroke; cheap because we only mutate one style property.
  useEffect(() => {
    const el = editInputRef?.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }, [editingText, editInputRef]);

  return (
    <div
      ref={wrapperRef}
      className="bg-white dark:bg-gray-900 rounded-2xl px-3.5 py-3 mb-0.5 ring-2 ring-stone-900/80 dark:ring-stone-100/80 shadow-md min-w-[260px] sm:min-w-[320px]"
    >
      <textarea
        ref={editInputRef}
        value={editingText}
        onChange={(e) => setEditingText(e.target.value)}
        onKeyDown={onEditKeyDown}
        rows={1}
        className="w-full bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 resize-none outline-none leading-relaxed"
        placeholder="Edit your message…"
      />

      {/* Footer: keyboard hint on the left, actions on the right */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-stone-100 dark:border-gray-800">
        <p className="text-[11px] text-stone-400 dark:text-stone-500 hidden sm:block">
          <kbd className="px-1 py-0.5 rounded bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-stone-300 font-mono text-[10px]">Esc</kbd> to cancel ·{' '}
          <kbd className="px-1 py-0.5 rounded bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-stone-300 font-mono text-[10px]">Enter</kbd> to save
        </p>
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FiX size={12} /> Cancel
          </button>
          <button
            type="button"
            onClick={onEditSave}
            disabled={!editingText.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiCheck size={12} /> Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMessageInline;
