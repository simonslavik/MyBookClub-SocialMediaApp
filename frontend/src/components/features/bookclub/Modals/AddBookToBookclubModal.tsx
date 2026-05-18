import { useState, useContext, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiSearch, FiX, FiBook, FiChevronLeft } from 'react-icons/fi';
import AuthContext from '@context/index';
import apiClient from '@api/axios';
import logger from '@utils/logger';
import { useToast } from '@hooks/useUIFeedback';

const STATUS_OPTIONS = [
  { key: 'current',   label: 'Currently reading' },
  { key: 'upcoming',  label: 'Coming up next' },
  { key: 'completed', label: 'Completed' },
] as const;

type StatusKey = typeof STATUS_OPTIONS[number]['key'];

const AddBookToBookclubModal = ({ bookClubId, onClose, onBookAdded }) => {
  const { auth } = useContext(AuthContext);
  const { toastError, toastWarning } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [status, setStatus] = useState<StatusKey>('upcoming');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adding, setAdding] = useState(false);

  // Body scroll lock + Escape close.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const { data } = await apiClient.get(`/v1/books/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      setSearchResults(data.success ? (data.data || []) : []);
      if (!data.success) toastError('Failed to search for books');
    } catch (err: any) {
      logger.error('Error searching books:', err);
      toastError('Failed to search for books');
    } finally {
      setSearching(false);
    }
  }, [searchQuery, toastError]);

  const handleAddBook = useCallback(async () => {
    if (!selectedBook) return;
    if (!auth?.token) { toastWarning('Please log in to add books'); return; }
    if (!selectedBook.googleBooksId) { toastWarning('Invalid book data — missing Google Books ID'); return; }

    setAdding(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const { data } = await apiClient.post(
        `/v1/bookclub/${bookClubId}/books`,
        {
          googleBooksId: selectedBook.googleBooksId,
          status,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (data.success) {
        onBookAdded(data.data);
        onClose();
      } else {
        toastError(data.error || 'Failed to add book');
      }
    } catch (err: any) {
      logger.error('Error adding book:', err);
      if (err.name === 'AbortError') toastError('Request timed out. Please try again.');
      else if (err.message?.includes('fetch')) toastError('Network error. Please check your connection.');
      else toastError(`Failed to add book: ${err.message}`);
    } finally {
      setAdding(false);
    }
  }, [selectedBook, auth?.token, bookClubId, status, startDate, endDate, onBookAdded, onClose, toastError, toastWarning]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add book to bookclub"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 w-full sm:max-w-3xl sm:max-h-[85vh] h-[92vh] sm:h-auto sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
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
              {selectedBook ? 'Set status & dates' : 'Add a book to the club'}
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

        {/* STEP 1: Search */}
        {!selectedBook && (
          <>
            <form onSubmit={handleSearch} className="px-5 pt-4 pb-3 flex-shrink-0">
              <div className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
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

            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
              {searching && (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin" />
                </div>
              )}

              {!searching && !hasSearched && (
                <div className="text-center py-16 text-stone-400 dark:text-stone-500">
                  <FiBook className="mx-auto mb-3" size={36} />
                  <p className="text-sm">Find a book to add to the club's reading list.</p>
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

        {/* STEP 2: Status + dates */}
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
                </div>
              </div>

              {/* Status pills */}
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-2">Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatus(key)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        status === key
                          ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                          : 'bg-stone-100 dark:bg-gray-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-2">
                    Start date {status !== 'completed' && <span className="font-normal normal-case tracking-normal">(optional)</span>}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-2">
                    {status === 'completed' ? 'Finished date' : 'Target end'} <span className="font-normal normal-case tracking-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
                  />
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-stone-100 dark:border-gray-800 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleAddBook}
                disabled={adding}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {adding && <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
                {adding ? 'Adding…' : 'Add book'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AddBookToBookclubModal;
