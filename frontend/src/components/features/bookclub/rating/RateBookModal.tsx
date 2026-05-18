import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';

/**
 * RateBookModal — 5-star rating modal.
 *
 * Scale: 1 → 5 integer stars (matches the backend `rating Int` column).
 * If we later want half-star precision (Goodreads/Storygraph style)
 * we'll need a Prisma migration to widen the column to 1-10 + display
 * conversion in StarRating. For now full stars only, keeps it round-trip
 * safe with the API.
 *
 * Design: portal + body scroll lock + Escape close + mobile bottom
 * sheet, matching the rest of the app's modal system (AddBookToLibrary,
 * SuggestBookModal). Replaces the previous dark gray-800 card that had
 * a bouncy `hover:scale-125` interaction and didn't share visual
 * language with the redesigned modals.
 */
const RateBookModal = ({ isOpen, onClose, onRate, onRemoveRating, currentRating, bookTitle }) => {
  const [hoverValue, setHoverValue] = useState(0);
  const [selected, setSelected] = useState(currentRating || 0);
  const [submitting, setSubmitting] = useState(false);

  // Reset when modal reopens with a different book / rating.
  useEffect(() => {
    if (isOpen) {
      setSelected(currentRating || 0);
      setHoverValue(0);
    }
  }, [isOpen, currentRating]);

  // Body scroll lock + Escape close.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (selected < 1) return;
    setSubmitting(true);
    try {
      await onRate(selected);
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setSubmitting(true);
    try {
      await onRemoveRating();
      setSelected(0);
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const labelFor = (v: number) =>
    ['', 'Did not like', 'It was OK', 'Liked it', 'Really liked it', 'Loved it'][v] || '';

  const displayValue = hoverValue || selected;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Rate this book"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Rate this book</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2">{bookTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </header>

        {/* Star picker */}
        <div className="px-6 pt-2 pb-5">
          <div
            className="flex justify-center gap-2 select-none"
            onMouseLeave={() => setHoverValue(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = displayValue >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverValue(star)}
                  onClick={() => setSelected(star)}
                  className="p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-md"
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                >
                  {filled
                    ? <FaStar className="text-3xl text-amber-400" />
                    : <FaRegStar className="text-3xl text-stone-300 dark:text-stone-600" />}
                </button>
              );
            })}
          </div>

          {/* Numeric + label slot — fixed height so the modal doesn't
              jump as the user hovers in/out. */}
          <div className="h-6 mt-3 flex items-center justify-center">
            {displayValue > 0 && (
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                <span className="text-stone-900 dark:text-stone-100 font-semibold tabular-nums">{displayValue}</span>
                <span className="text-stone-400 dark:text-stone-500"> / 5</span>
                <span className="mx-2 text-stone-300 dark:text-stone-600">·</span>
                <span>{labelFor(displayValue)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-6 pb-6 pt-1">
          {currentRating ? (
            <button
              onClick={handleRemove}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          ) : (
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || selected < 1}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {submitting && <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
            {submitting ? 'Saving…' : currentRating ? 'Update' : 'Rate'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RateBookModal;
