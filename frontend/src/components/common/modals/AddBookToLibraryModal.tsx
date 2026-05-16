import { useState, useContext, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiSearch, FiX, FiBook, FiBookmark, FiBookOpen, FiCheckCircle, FiHeart, FiCheck } from 'react-icons/fi';
import { AuthContext } from '@context/index';
import apiClient from '@api/axios';
import logger from '@utils/logger';

const STATUS_OPTIONS = [
  { key: 'want_to_read', label: 'Want to read', Icon: FiBookmark, accent: 'text-amber-500' },
  { key: 'reading',      label: 'Reading now',  Icon: FiBookOpen, accent: 'text-emerald-500' },
  { key: 'completed',    label: 'Finished',     Icon: FiCheckCircle, accent: 'text-stone-500' },
  { key: 'favorite',     label: 'Favourite',    Icon: FiHeart,   accent: 'text-rose-500' },
] as const;

type StatusKey = typeof STATUS_OPTIONS[number]['key'];

const AddBookToLibraryModal = ({ onClose, onBookAdded }) => {
  const { auth } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  // Tracks which books have been added in this session and their final status,
  // so the user gets immediate visual feedback ("Added · Reading") instead of
  // wondering if their tap registered.
  const [addedBooks, setAddedBooks] = useState<Record<string, StatusKey>>({});

  // Body scroll lock + Escape close — applied while the modal is mounted.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const searchBooks = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const { data } = await apiClient.get(`/v1/books/search?q=${encodeURIComponent(query)}&limit=20`);
      setResults(data.success ? (data.data || []) : []);
      if (!data.success) setError('Failed to search books');
    } catch (err) {
      logger.error('Search error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const addToLibrary = useCallback(async (googleBooksId: string, status: StatusKey) => {
    if (!auth?.token) {
      setError('Please log in to add books to your library.');
      return;
    }
    setAddingBookId(googleBooksId);
    setError(null);
    try {
      const { data } = await apiClient.post('/v1/user-books', { googleBooksId, status });
      if (data.success) {
        setAddedBooks(prev => ({ ...prev, [googleBooksId]: status }));
        onBookAdded?.();
      } else {
        setError(data.error || 'Failed to add book');
      }
    } catch (err) {
      logger.error('Add book error:', err);
      setError('Network error. Please try again.');
    } finally {
      setAddingBookId(null);
    }
  }, [auth?.token, onBookAdded]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add books to your library"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 w-full sm:max-w-3xl sm:max-h-[85vh] h-[92vh] sm:h-auto sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header — minimal: title + close. No coloured banner, lets the
            content breathe instead of dominating with brand chrome. */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Add to your library
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </header>

        {/* Search */}
        <form onSubmit={searchBooks} className="px-5 pt-4 pb-3 flex-shrink-0">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
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
                onClick={() => { setQuery(''); setResults([]); setHasSearched(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded transition-colors"
                aria-label="Clear search"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        </form>

        {/* Inline error — keeps height predictable */}
        {error && (
          <div className="mx-5 mb-3 px-4 py-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm rounded-lg flex-shrink-0">
            {error}
          </div>
        )}

        {/* Body — only this region scrolls */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin" />
            </div>
          )}

          {!loading && !hasSearched && (
            <div className="text-center py-16 text-stone-400 dark:text-stone-500">
              <FiBook className="mx-auto mb-3" size={36} />
              <p className="text-sm">Find a book to add to your library.</p>
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <div className="text-center py-16 text-stone-400 dark:text-stone-500">
              <p className="text-sm">No books matched <span className="font-medium text-stone-600 dark:text-stone-300">&ldquo;{query}&rdquo;</span></p>
              <p className="text-xs mt-1">Try a different keyword or author.</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="divide-y divide-stone-100 dark:divide-gray-800">
              {results.map((book: any) => {
                const isAdding = addingBookId === book.googleBooksId;
                const addedStatus = addedBooks[book.googleBooksId];
                const addedOption = STATUS_OPTIONS.find(s => s.key === addedStatus);
                return (
                  <li key={book.googleBooksId} className="py-3 flex items-start gap-3">
                    {/* Cover */}
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

                    {/* Title + author + actions */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                        {book.title}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                        {book.author}
                        {book.pageCount && <span className="text-stone-400 dark:text-stone-500"> · {book.pageCount}p</span>}
                      </p>

                      {/* Status row — 4 icon-only chips. Once added, the row
                          collapses to a confirmation pill so the user knows
                          the action took without us blocking re-categorisation. */}
                      {addedOption ? (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                          <FiCheck size={12} />
                          Added · {addedOption.label}
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {STATUS_OPTIONS.map(({ key, label, Icon, accent }) => (
                            <button
                              key={key}
                              onClick={() => addToLibrary(book.googleBooksId, key)}
                              disabled={isAdding}
                              title={label}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-stone-700 dark:text-stone-200 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Icon className={accent} size={12} />
                              <span className="hidden sm:inline">{label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddBookToLibraryModal;
