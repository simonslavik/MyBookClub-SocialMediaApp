import { useState, useMemo, useEffect, useRef } from 'react';
import { FiPlus, FiBook, FiMoreVertical, FiTrash2, FiInfo } from 'react-icons/fi';

const SHELF_META: Record<string, { label: string; dot: string }> = {
  favorite:     { label: 'Favourite',    dot: 'bg-rose-500' },
  reading:      { label: 'Reading',      dot: 'bg-emerald-500' },
  want_to_read: { label: 'Want to read', dot: 'bg-amber-500' },
  completed:    { label: 'Finished',     dot: 'bg-stone-400' },
};

const TABS = [
  { key: 'all',          label: 'All' },
  { key: 'reading',      label: 'Reading' },
  { key: 'want_to_read', label: 'Want to read' },
  { key: 'completed',    label: 'Finished' },
  { key: 'favorite',     label: 'Favourites' },
];

export default function BookLibrary({
  favoriteBooks, booksReading, booksToRead, booksRead,
  isOwnProfile, profileName,
  onAddBook, onDeleteBook, onViewBook,
}) {
  const [filter, setFilter] = useState('all');

  const counts = useMemo(() => ({
    all: favoriteBooks.length + booksReading.length + booksToRead.length + booksRead.length,
    reading: booksReading.length,
    want_to_read: booksToRead.length,
    completed: booksRead.length,
    favorite: favoriteBooks.length,
  }), [favoriteBooks, booksReading, booksToRead, booksRead]);

  const filteredBooks = useMemo(() => {
    const tag = (arr, shelf) => arr.map(b => ({ ...b, _shelf: shelf }));
    if (filter === 'all') {
      return [
        ...tag(booksReading, 'reading'),
        ...tag(booksToRead, 'want_to_read'),
        ...tag(booksRead, 'completed'),
        ...tag(favoriteBooks, 'favorite'),
      ];
    }
    if (filter === 'reading') return tag(booksReading, 'reading');
    if (filter === 'want_to_read') return tag(booksToRead, 'want_to_read');
    if (filter === 'completed') return tag(booksRead, 'completed');
    return tag(favoriteBooks, 'favorite');
  }, [filter, favoriteBooks, booksReading, booksToRead, booksRead]);

  if (counts.all === 0 && !isOwnProfile) return null;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <p className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-outfit font-semibold">
          {isOwnProfile ? 'My library' : `${profileName}'s library`}
        </p>
        {isOwnProfile && (
          <button
            onClick={onAddBook}
            className="px-3 sm:px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-full text-xs sm:text-sm font-semibold font-outfit transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <FiPlus size={14} />
            <span className="hidden sm:inline">Add books</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      {/* Filter tabs — horizontal scroll on mobile (one row, swipeable),
          wrap on desktop. Counts shown as subtle dim suffix. */}
      <div className="flex flex-nowrap sm:flex-wrap gap-1.5 overflow-x-auto sm:overflow-visible -mx-5 px-5 sm:mx-0 sm:px-0 mb-5 pb-1 sm:pb-0 scrollbar-hide">
        {TABS.map(tab => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium font-outfit transition-colors whitespace-nowrap ${
                active
                  ? 'bg-stone-800 dark:bg-warmgray-200 text-white dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 ${active ? 'opacity-70' : 'opacity-50'}`}>{counts[tab.key]}</span>
            </button>
          );
        })}
      </div>

      {/* Grid or empty */}
      {filteredBooks.length === 0 ? (
        <div className="rounded-2xl bg-stone-50 dark:bg-gray-800/50 py-12 text-center">
          <FiBook className="mx-auto text-stone-300 dark:text-gray-600 mb-2" size={28} />
          <p className="text-stone-500 dark:text-gray-400 text-sm font-outfit">
            {isOwnProfile
              ? filter === 'all'
                ? 'Your library is empty.'
                : 'Nothing on this shelf yet.'
              : 'No books in library.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredBooks.map(ub => (
            <BookCard
              key={ub.id}
              userBook={ub}
              showShelf={filter === 'all'}
              isOwnProfile={isOwnProfile}
              onDelete={onDeleteBook}
              onView={onViewBook}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Book card ────────────────────────────────────── */
function BookCard({ userBook, showShelf, isOwnProfile, onDelete, onView }) {
  const meta = SHELF_META[userBook._shelf];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the overflow menu on outside click. Cheap — only attached while open.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="group relative">
      {/* Cover — clean, no overlays. Tap surface that opens details. */}
      <button
        onClick={() => onView(userBook.book)}
        className="block w-full rounded-lg overflow-hidden ring-1 ring-black/5 dark:ring-white/10 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 bg-stone-100 dark:bg-gray-800"
        aria-label={`View ${userBook.book.title}`}
      >
        {userBook.book.coverUrl ? (
          <img
            src={userBook.book.coverUrl}
            alt=""
            className="w-full aspect-[2/3] object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
          />
        ) : (
          <div className="w-full aspect-[2/3] flex items-center justify-center">
            <FiBook className="text-stone-400" size={24} />
          </div>
        )}
      </button>

      {/* Overflow menu — only on own profile. Always visible on mobile (no
          hover affordance there); desktop reveals it on group hover so the
          cover stays clean while browsing. */}
      {isOwnProfile && (
        <div ref={menuRef} className="absolute top-1.5 right-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
            className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            aria-label="More options"
          >
            <FiMoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-32 rounded-lg shadow-xl ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-gray-800 overflow-hidden z-10">
              <button
                onClick={() => { setMenuOpen(false); onView(userBook.book); }}
                className="w-full px-3 py-2 text-left text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <FiInfo size={12} /> Details
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(userBook.id); }}
                className="w-full px-3 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2"
              >
                <FiTrash2 size={12} /> Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Title + meta below the cover — no overlays mean book art reads
          cleanly. Status comes through as a colored dot before the title
          (only when the All filter is on, otherwise it'd be redundant). */}
      <div className="mt-2">
        <h4 className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-100 line-clamp-2 leading-snug font-display flex items-start gap-1.5">
          {showShelf && meta && (
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${meta.dot} mt-1.5 flex-shrink-0`}
              title={meta.label}
            />
          )}
          <span className="min-w-0">{userBook.book.title}</span>
        </h4>
        <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate font-outfit">
          {userBook.book.author}
        </p>
        {userBook.rating > 0 && (
          <p className="text-[11px] text-amber-500 mt-0.5 tracking-tight">
            {'★'.repeat(userBook.rating)}
            <span className="text-stone-300 dark:text-gray-600">{'★'.repeat(5 - userBook.rating)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
