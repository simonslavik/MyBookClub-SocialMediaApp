import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiSearch, FiBook, FiChevronLeft } from 'react-icons/fi';
import apiClient from '@api/axios';
import logger from '@utils/logger';

const REASON_MAX = 200;

const SuggestBookModal = ({ isOpen, onClose, bookClubId, auth, onBookSuggested }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Body scroll lock + Escape close — applied while the modal is mounted.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // Reset internal state when modal closes so reopening starts fresh.
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedBook(null);
      setReason('');
      setHasSearched(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    setHasSearched(true);
    try {
      const { data } = await apiClient.get(
        `/v1/books/search?q=${encodeURIComponent(searchQuery)}&limit=15`
      );
      setSearchResults(data.success ? (data.data || data.books || []) : []);
      if (!data.success) setError('Failed to search books');
    } catch (err) {
      logger.error('Search error:', err);
      setError('Network error. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleSubmit = useCallback(async () => {
    if (!selectedBook) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post(
        `/v1/bookclub/${bookClubId}/suggestions`,
        { googleBooksId: selectedBook.googleBooksId, reason: reason.trim() || null }
      );
      onBookSuggested?.(data.data);
      onClose();
    } catch (err: any) {
      logger.error('Suggest error:', err);
      setError(err.response?.data?.error || 'Failed to suggest book');
    } finally {
      setLoading(false);
    }
  }, [selectedBook, reason, bookClubId, onBookSuggested, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Suggest a book"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 w-full sm:max-w-3xl sm:max-h-[85vh] h-[92vh] sm:h-auto sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header — minimal: title + close */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {selectedBook && (
              <button
                onClick={() => setSelectedBook(null)}
                className="p-1 -ml-1 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Back to search"
              >
                <FiChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 truncate">
              {selectedBook ? 'Add a note' : 'Suggest a book'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </header>

        {/* Inline error — keeps height predictable */}
        {error && (
          <div className="mx-5 mt-3 px-4 py-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm rounded-lg flex-shrink-0">
            {error}
          </div>
        )}

        {/* ── STEP 1: Search → results ── */}
        {!selectedBook && (
          <>
            <form onSubmit={handleSearch} className="px-5 pt-4 pb-3 flex-shrink-0">
              <div className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, author, or ISBN…"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setHasSearched(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded transition-colors"
                    aria-label="Clear search"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
            </form>

            {/* Body — only this region scrolls */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
              {searching && (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin" />
                </div>
              )}

              {!searching && !hasSearched && (
                <div className="text-center py-16 text-stone-400 dark:text-stone-500">
                  <FiBook className="mx-auto mb-3" size={36} />
                  <p className="text-sm">Find a book to suggest to the club.</p>
                </div>
              )}

              {!searching && hasSearched && searchResults.length === 0 && (
                <div className="text-center py-16 text-stone-400 dark:text-stone-500">
                  <p className="text-sm">No books matched <span className="font-medium text-stone-600 dark:text-stone-300">&ldquo;{searchQuery}&rdquo;</span></p>
                  <p className="text-xs mt-1">Try a different keyword or author.</p>
                </div>
              )}

              {!searching && searchResults.length > 0 && (
                <ul className="divide-y divide-stone-100 dark:divide-gray-800">
                  {searchResults.map((book: any) => (
                    <li key={book.googleBooksId}>
                      <button
                        type="button"
                        onClick={() => setSelectedBook(book)}
                        className="w-full text-left py-3 flex items-start gap-3 hover:bg-stone-50 dark:hover:bg-gray-800/40 -mx-2 px-2 rounded-lg transition-colors"
                      >
                        <div className="w-12 h-16 sm:w-14 sm:h-20 rounded bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {book.coverUrl ? (
                            <img
                              src={book.coverUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                            />
                          ) : (
                            <FiBook className="text-stone-400" size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                            {book.title}
                          </h3>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                            {book.author}
                            {book.pageCount && <span className="text-stone-400 dark:text-stone-500"> · {book.pageCount}p</span>}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* ── STEP 2: Note + submit ── */}
        {selectedBook && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-5">
              {/* Selected book preview */}
              <div className="flex gap-4 p-4 rounded-xl bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200/60 dark:ring-gray-800">
                <div className="w-16 h-24 rounded bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {selectedBook.coverUrl ? (
                    <img
                      src={selectedBook.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                  ) : (
                    <FiBook className="text-stone-400" size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                    {selectedBook.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                    {selectedBook.author}
                    {selectedBook.pageCount && <span> · {selectedBook.pageCount}p</span>}
                  </p>
                  {selectedBook.description && (
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-2 line-clamp-3 leading-relaxed">
                      {selectedBook.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional reason — placeholder carries the prompt, no label */}
              <div className="mt-5">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
                  placeholder="Why this book? (optional)"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition resize-none"
                />
                <p className="text-[11px] text-stone-400 dark:text-stone-500 text-right mt-1">{reason.length}/{REASON_MAX}</p>
              </div>
            </div>

            {/* Sticky footer — only on step 2 */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-stone-100 dark:border-gray-800 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                )}
                {loading ? 'Suggesting…' : 'Suggest book'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SuggestBookModal;
