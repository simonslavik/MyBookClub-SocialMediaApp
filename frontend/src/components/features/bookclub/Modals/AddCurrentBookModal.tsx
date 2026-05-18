import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiSearch, FiBook, FiChevronLeft } from 'react-icons/fi';
import apiClient from '@api/axios';
import logger from '@utils/logger';
import { useToast } from '@hooks/useUIFeedback';

const AddCurrentBookModal = ({ bookClubId, onClose, onBookAdded }) => {
  const { toastError } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  // Schedule state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [readingDays, setReadingDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

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

  // Auto-search with debouncing.
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);
      try {
        const { data } = await apiClient.get(`/v1/books/search?q=${encodeURIComponent(query)}&limit=15`);
        if (data.success) setSearchResults(data.data || []);
      } catch (err) {
        logger.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Auto-calculate end date when start date or reading days change.
  useEffect(() => {
    if (startDate && readingDays > 0) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + readingDays);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [startDate, readingDays]);

  const handleSelectBook = (book: any) => {
    setSelectedBook(book);
    setStep(2);
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
  };

  const handleSubmit = async () => {
    if (!selectedBook || !startDate || !endDate) return;
    setSubmitting(true);
    try {
      const { data } = await apiClient.post(`/v1/bookclub/${bookClubId}/books`, {
        googleBooksId: selectedBook.googleBooksId,
        status: 'current',
        startDate,
        endDate,
      });
      if (data.success) {
        onBookAdded(data.data);
        onClose();
      } else {
        toastError(data.error || 'Failed to add book');
      }
    } catch (err: any) {
      logger.error('Error adding book:', err);
      toastError('Failed to add book to bookclub');
    } finally {
      setSubmitting(false);
    }
  };

  const pagesPerDay = (() => {
    if (!selectedBook?.pageCount || !readingDays) return 0;
    return Math.ceil(selectedBook.pageCount / readingDays);
  })();

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Set current book"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 w-full sm:max-w-2xl sm:max-h-[85vh] h-[92vh] sm:h-auto sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="p-1 -ml-1 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Back to search"
              >
                <FiChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 truncate">
              {step === 1 ? 'Choose a book to start' : 'Set reading schedule'}
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

        {/* STEP 1: search */}
        {step === 1 && (
          <>
            <div className="px-5 pt-4 pb-3 flex-shrink-0">
              <div className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title, author, or ISBN…"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); setSearchResults([]); setHasSearched(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded transition-colors"
                    aria-label="Clear search"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
              {loading && (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin" />
                </div>
              )}

              {!loading && !hasSearched && (
                <div className="text-center py-16 text-stone-400 dark:text-stone-500">
                  <FiBook className="mx-auto mb-3" size={36} />
                  <p className="text-sm">Pick the book the club will start reading.</p>
                </div>
              )}

              {!loading && hasSearched && searchResults.length === 0 && (
                <div className="text-center py-16 text-stone-400 dark:text-stone-500">
                  <p className="text-sm">No books matched <span className="font-medium text-stone-600 dark:text-stone-300">&ldquo;{query}&rdquo;</span></p>
                  <p className="text-xs mt-1">Try a different keyword or author.</p>
                </div>
              )}

              {!loading && searchResults.length > 0 && (
                <ul className="divide-y divide-stone-100 dark:divide-gray-800">
                  {searchResults.map((book: any) => (
                    <li key={book.googleBooksId}>
                      <button
                        type="button"
                        onClick={() => handleSelectBook(book)}
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
                            {book.pageCount && <span> · {book.pageCount}p</span>}
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

        {/* STEP 2: schedule */}
        {step === 2 && selectedBook && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-5">
              {/* Selected book card */}
              <div className="flex gap-4 p-4 rounded-xl bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200/60 dark:ring-gray-800">
                <div className="w-20 h-28 rounded bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {selectedBook.coverUrl ? (
                    <img
                      src={selectedBook.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                  ) : (
                    <FiBook className="text-stone-400" size={28} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                    {selectedBook.title}
                  </h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{selectedBook.author}</p>
                  {selectedBook.pageCount && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      <span className="font-medium text-stone-700 dark:text-stone-300">{selectedBook.pageCount}</span> pages
                    </p>
                  )}
                </div>
              </div>

              {/* Schedule controls */}
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-2">
                    Start date
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
                    Reading duration <span className="font-normal normal-case tracking-normal text-stone-400 dark:text-stone-500">— {readingDays} days</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="7"
                      max="90"
                      value={readingDays}
                      onChange={(e) => setReadingDays(parseInt(e.target.value))}
                      className="flex-1 accent-stone-900 dark:accent-stone-100"
                    />
                    <input
                      type="number"
                      min="7"
                      max="90"
                      value={readingDays}
                      onChange={(e) => setReadingDays(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1.5 rounded-lg bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 text-center focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-2">
                    Target completion
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
                  />
                </div>

                {/* Reading stats — auto-derived from page count + duration */}
                {selectedBook.pageCount && readingDays > 0 && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="p-4 rounded-xl bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200/60 dark:ring-gray-800 text-center">
                      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">{pagesPerDay}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Pages per day</p>
                    </div>
                    <div className="p-4 rounded-xl bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200/60 dark:ring-gray-800 text-center">
                      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">{readingDays}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Days to complete</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky footer */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-stone-100 dark:border-gray-800 flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !startDate || !endDate}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {submitting && <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
                {submitting ? 'Adding…' : 'Start reading'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AddCurrentBookModal;
