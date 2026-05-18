import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiUsers } from 'react-icons/fi';
import { getCollabImageUrl, getProfileImageUrl } from '@config/constants';
import { getAvatarUrl, getAvatarSeed, getBookclubCoverUrl, getBookclubSeed } from '@utils/avatar';
import AuthContext from '@context/index';

const DEFAULT_IMAGE = '/images/default.svg';

// ─── Sub-components ──────────────────────────────────────────

/** "Create Book Club" card (dashed border). */
const CreateClubCard = ({ onClick, scale, opacity, zIndex, isCenter }) => (
  <div
    onClick={onClick}
    className="w-[240px] sm:w-[300px] h-[460px] sm:h-[520px] flex-shrink-0 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-out group"
    style={{
      transform: `scale(${scale})`,
      opacity,
      zIndex,
      background: isCenter ? '#E4DDD4' : '#EBE6DF',
      border: '2px dashed',
      borderColor: isCenter ? '#a09080' : '#d5cec4',
      boxShadow: isCenter ? '0 12px 40px rgba(180, 160, 130, 0.12)' : 'none',
    }}
  >
    <div className="w-16 h-16 rounded-full bg-white/40 group-hover:bg-white/60 flex items-center justify-center transition-colors mb-3">
      <span className="text-3xl text-stone-500 group-hover:text-stone-700 transition-colors">+</span>
    </div>
    <span className="text-sm text-stone-500 group-hover:text-stone-700 font-semibold transition-colors">
      Create Book Club
    </span>
  </div>
);

/** Text-focused book preview inside a club card. */
const CurrentBooksPreview = ({ books, clubId, bookIdx, onChangeIndex }) => {
  const currentEntry = books[bookIdx] || books[0];
  const hasMultiple = books.length > 1;
  // Backend falls back to upcoming books when there's no current one — relabel.
  const allUpcoming = books.every((b) => b.status === 'upcoming');
  const heading = allUpcoming ? 'Up Next' : 'Currently Reading';

  return (
    <div className="mt-3 px-3 py-2 rounded-xl bg-stone-800/5 dark:bg-white/5 flex-shrink min-h-0">
      <p className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 font-semibold mb-1">
        {heading}
      </p>

      <div className="flex items-center gap-2">
        {hasMultiple && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex(clubId, (bookIdx - 1 + books.length) % books.length);
            }}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            <FiChevronLeft size={12} />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-serif italic text-stone-700 dark:text-stone-200 line-clamp-2 leading-snug">
            {currentEntry.book?.title}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            — {currentEntry.book?.author}
          </p>
        </div>

        {hasMultiple && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex(clubId, (bookIdx + 1) % books.length);
            }}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            <FiChevronRight size={12} />
          </button>
        )}
      </div>

      {hasMultiple && (
        <div className="flex justify-center gap-1 mt-2">
          {books.map((_, bi) => (
            <button
              key={bi}
              onClick={(e) => {
                e.stopPropagation();
                onChangeIndex(clubId, bi);
              }}
              className={`rounded-full transition-all ${
                bi === bookIdx
                  ? 'w-3 h-1.5 bg-stone-500'
                  : 'w-1.5 h-1.5 bg-stone-300 dark:bg-stone-600 hover:bg-stone-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/** Member avatar stack shown at the bottom of a club card. */
const MemberAvatars = ({ members, memberCount, onHover, onLeave }) => {
  const navigate = useNavigate();
  const list = members || [];
  const total = memberCount ?? list.length;

  // Count-only fallback when avatar data is missing — keeps the bottom row
  // populated so cards stay visually balanced.
  if (list.length === 0) {
    return (
      <div className="mt-auto pt-3 flex items-center gap-2 text-stone-400 flex-shrink-0">
        <FiUsers size={14} />
        <span className="text-xs font-medium">
          {total} {total === 1 ? 'member' : 'members'}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-auto pt-3 flex items-center justify-between flex-shrink-0">
      <div className="flex -space-x-2">
        {list.slice(0, 4).map((member) => {
          const fallback = getAvatarUrl(getAvatarSeed(member));
          return (
            <div key={member.id} className="relative">
              <img
                src={getProfileImageUrl(member.profileImage) || fallback}
                alt={member.username}
                className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-sm cursor-pointer hover:ring-2 hover:ring-stone-400 transition-all hover:z-10 relative"
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${member.id}`); }}
                onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
                onMouseEnter={(e) => onHover(e, member)}
                onMouseLeave={onLeave}
              />
            </div>
          );
        })}
        {total > list.length && (
          <div className="w-7 h-7 rounded-full border-2 border-white bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-700">
            +{total - list.length}
          </div>
        )}
      </div>
      <span className="text-xs text-gray-400 font-medium">
        {total} {total === 1 ? 'member' : 'members'}
      </span>
    </div>
  );
};

const PASTEL_PALETTES = [
  { bg: '#E8E0D4', text: '#5C4A3A' },  // warm sand
  { bg: '#D4DDE8', text: '#3A4A5C' },  // dusty blue
  { bg: '#D8E4D4', text: '#3A5C40' },  // sage green
  { bg: '#E4D4DE', text: '#5C3A52' },  // muted mauve
  { bg: '#DDD8CE', text: '#4A4438' },  // taupe
  { bg: '#D4DBD8', text: '#3A4A44' },  // sea foam
  { bg: '#E0D9CE', text: '#54493A' },  // parchment
  { bg: '#D4D4E4', text: '#3A3A5C' },  // lavender gray
];

const getPastelForClub = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return PASTEL_PALETTES[Math.abs(hash) % PASTEL_PALETTES.length];
};

/** Single "book club" card inside the carousel. */
const ClubCard = ({ bookClub, scale, opacity, zIndex, isCenter, cardBookIndex, onChangeBookIndex, onMemberHover, onMemberLeave }) => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const palette = getPastelForClub(bookClub.id);

  return (
    <div
      onClick={() => navigate(`/bookclub/${bookClub.id}`)}
      className="w-[240px] sm:w-[300px] h-[460px] sm:h-[520px] flex-shrink-0 rounded-2xl flex flex-col cursor-pointer transition-all duration-500 ease-out relative overflow-hidden"
      style={{
        transform: `scale(${scale})`,
        opacity,
        zIndex,
        background: palette.bg,
        boxShadow: isCenter
          ? '0 16px 48px rgba(120, 100, 70, 0.14), 0 0 0 1px rgba(180, 160, 130, 0.1)'
          : '0 2px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)',
      }}
    >
      {/* Top section — full-width image covering most of the card */}
      <div className="relative h-[220px] sm:h-[270px] flex-shrink-0 overflow-hidden rounded-t-2xl">
        {(() => {
          const coverFallback = getBookclubCoverUrl(getBookclubSeed(bookClub));
          return (
            <img
              src={bookClub.imageUrl ? getCollabImageUrl(bookClub.imageUrl) : coverFallback}
              alt={bookClub.name}
              className="w-full h-full object-cover transition-transform duration-500"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).src = coverFallback; }}
            />
          );
        })()}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Owner badge */}
        {bookClub.creatorId === auth?.user?.id && (
          <span className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm text-stone-700 text-[11px] px-2 py-0.5 rounded-full font-semibold">
            ✦ Owner
          </span>
        )}

        {/* Online indicator */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-white text-[11px] font-medium">{bookClub.activeUsers || 0} online</span>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 px-4 pt-3 pb-4">
        {/* Title — reserves space for exactly 2 lines so card layout doesn't
            shift when titles wrap differently. */}
        <h3
          className="font-bold text-lg sm:text-xl leading-tight line-clamp-2"
          style={{ color: palette.text, minHeight: 'calc(2 * 1.25 * 1.125rem)' }}
        >
          {bookClub.name}
        </h3>

        {/* Description — always renders the 2-line slot (even if empty) so the
            books preview + members row align across cards regardless of
            description length. */}
        <p
          className="text-xs mt-1.5 line-clamp-2 leading-relaxed opacity-60"
          style={{ color: palette.text, minHeight: 'calc(2 * 1.625 * 0.75rem)' }}
        >
          {bookClub.description || ''}
        </p>

        {/* Current books preview — text only */}
        {bookClub.currentBooks?.length > 0 && (
          <div className="w-full">
            <CurrentBooksPreview
              books={bookClub.currentBooks}
              clubId={bookClub.id}
              bookIdx={cardBookIndex[bookClub.id] || 0}
              onChangeIndex={onChangeBookIndex}
            />
          </div>
        )}

        {/* Empty state */}
        {(!bookClub.currentBooks || bookClub.currentBooks.length === 0) && (
          <div className="mt-3 flex-1 flex items-center justify-center">
            <p className="text-sm italic opacity-30" style={{ color: palette.text }}>No book selected yet</p>
          </div>
        )}

        {/* Members — always rendered so the row reserves space at the bottom
            of the card. MemberAvatars internally falls back to a count-only
            label ("N members") when no avatar data is available. */}
        <MemberAvatars
          members={bookClub.members}
          memberCount={bookClub.memberCount ?? bookClub.members?.length ?? 0}
          onHover={onMemberHover}
          onLeave={onMemberLeave}
        />
      </div>
    </div>
  );
};

// ─── Main Carousel ───────────────────────────────────────────

/**
 * Horizontally-scrolling carousel of the user's book clubs,
 * with a "Create" card appended at the end.
 */
const MyClubsCarousel = ({
  allMyBookClubs = [],
  filterCreatedByMe,
  onToggleFilter,
  onSetHoveredMember,
}) => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [cardBookIndex, setCardBookIndex] = useState({});

  // Responsive breakpoint — tracks sm (640px) via matchMedia instead of
  // reading window.innerWidth on every render (stale + no resize updates).
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const cardWidth = isMobile ? 240 : 300;
  const gap = isMobile ? 12 : 20;

  const displayed = useMemo(
    () =>
      filterCreatedByMe
        ? allMyBookClubs.filter((c) => c.creatorId === auth?.user?.id)
        : allMyBookClubs,
    [allMyBookClubs, filterCreatedByMe, auth?.user?.id]
  );

  // When the user toggles the "Mine" filter the underlying list changes
  // length and ordering — snap back to the first card so they land on a
  // real bookclub (or the Create card if they have none) instead of an
  // arbitrary clamped index from the previous view.
  useEffect(() => {
    setCarouselIndex(0);
  }, [filterCreatedByMe]);

  const handleChangeBookIndex = useCallback((clubId, newIdx) => {
    setCardBookIndex((prev) => ({ ...prev, [clubId]: newIdx }));
  }, []);

  const handleMemberHover = useCallback(
    (e, member) => {
      const rect = e.currentTarget.getBoundingClientRect();
      onSetHoveredMember({
        id: member.id,
        name: member.name || member.username,
        image: getProfileImageUrl(member.profileImage) || getAvatarUrl(getAvatarSeed(member)),
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    },
    [onSetHoveredMember]
  );

  const handleMemberLeave = useCallback(() => onSetHoveredMember(null), [onSetHoveredMember]);

  const createNewBookClub = () => navigate('/create-bookclub');

  // ── Empty state ──
  if (displayed.length === 0) {
    return (
      <div className="flex flex-col p-4 rounded w-full">
        <FilterButton active={filterCreatedByMe} onClick={onToggleFilter} />
        <div className="flex flex-col items-center justify-center py-2 text-gray-500">
          <p className="mb-5">
            {filterCreatedByMe
              ? "You haven't created any bookclubs yet."
              : "You're not in any bookclubs yet."}
          </p>
          <div
            onClick={createNewBookClub}
            className="w-[300px] h-[480px] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-out group hover:shadow-xl"
            style={{
              background: '#E4DDD4',
              border: '2px dashed',
              borderColor: '#a09080',
              boxShadow: '0 12px 40px rgba(180, 160, 130, 0.12)',
            }}
          >
            <div className="w-16 h-16 rounded-full bg-white/40 group-hover:bg-white/60 flex items-center justify-center transition-colors mb-3">
              <span className="text-3xl text-stone-500 group-hover:text-stone-700 transition-colors">+</span>
            </div>
            <span className="text-sm text-stone-500 group-hover:text-stone-700 font-semibold transition-colors">
              Create Book Club
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Carousel items ──
  const items: { type: string; data?: any }[] = [
    ...displayed.map((c) => ({ type: 'club' as const, data: c })),
    { type: 'create' },
  ];
  const idx = Math.min(carouselIndex, items.length - 1);

  const goPrev = () => setCarouselIndex((i) => Math.max(0, i - 1));
  const goNext = () => setCarouselIndex((i) => Math.min(items.length - 1, i + 1));

  const getCardTransform = (index) => {
    const offset = index - idx;
    const isCenter = offset === 0;
    const absOffset = Math.abs(offset);
    return {
      scale: isCenter ? 1 : Math.max(0.7, 1 - absOffset * 0.15),
      opacity: isCenter ? 1 : Math.max(0.35, 1 - absOffset * 0.35),
      zIndex: 10 - absOffset,
      isCenter,
    };
  };

  const stripOffset = -(idx * (cardWidth + gap));

  return (
    <div className="flex flex-col p-4 rounded w-full">
      <FilterButton active={filterCreatedByMe} onClick={onToggleFilter} />

      <div
        className="relative w-full flex items-center justify-center"
        style={{ minHeight: isMobile ? '460px' : '520px' }}
      >
        {/* Left arrow */}
        <CarouselArrow
          direction="left"
          disabled={idx === 0}
          onClick={goPrev}
        />

        {/* Track */}
        <div
          className="overflow-x-clip overflow-y-visible w-full px-4 md:px-12"
          style={{ height: isMobile ? '460px' : '520px' }}
        >
          <div
            className="flex items-center h-full transition-transform duration-500 ease-out"
            style={{
              gap: `${gap}px`,
              transform: `translateX(calc(50% - ${cardWidth / 2}px + ${stripOffset}px))`,
            }}
          >
            {items.map((item, i) => {
              const { scale, opacity, zIndex, isCenter } = getCardTransform(i);

              if (item.type === 'create') {
                return (
                  <CreateClubCard
                    key="create-card"
                    onClick={createNewBookClub}
                    scale={scale}
                    opacity={opacity}
                    zIndex={zIndex}
                    isCenter={isCenter}
                  />
                );
              }

              return (
                <ClubCard
                  key={item.data.id}
                  bookClub={item.data}
                  scale={scale}
                  opacity={opacity}
                  zIndex={zIndex}
                  isCenter={isCenter}
                  cardBookIndex={cardBookIndex}
                  onChangeBookIndex={handleChangeBookIndex}
                  onMemberHover={handleMemberHover}
                  onMemberLeave={handleMemberLeave}
                />
              );
            })}
          </div>
        </div>

        {/* Right arrow */}
        <CarouselArrow
          direction="right"
          disabled={idx === items.length - 1}
          onClick={goNext}
        />
      </div>

      {/* Dot indicators — in normal flow under the carousel so the gap above
          (cards → dots) matches the gap below (dots → Discover button), which
          is set by `mt-6` on the Discover wrapper in home/index.tsx. */}
      <div className="mt-6 flex justify-center gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCarouselIndex(i)}
            className={`rounded-full transition-all duration-300 ${
              i === idx
                ? 'w-6 h-2.5 bg-stone-700 dark:bg-stone-400'
                : 'w-2.5 h-2.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Small helpers ───────────────────────────────────────────

const FilterButton = ({ active, onClick }) => (
  <div className="flex items-center justify-end mb-4">
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-stone-600 text-white'
          : 'bg-warmgray-200 dark:bg-gray-700 text-stone-600 dark:text-warmgray-300 hover:bg-warmgray-300 dark:hover:bg-gray-600'
      }`}
    >
      {active ? '★ Mine' : '☆ Mine'}
    </button>
  </div>
);

const CarouselArrow = ({ direction, disabled, onClick }) => {
  const isLeft = direction === 'left';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`absolute ${isLeft ? 'left-2 md:left-40' : 'right-2 md:right-40'} z-20 w-11 h-11 rounded-full flex items-center justify-center transition-all ${
        disabled
          ? 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-500 cursor-not-allowed'
          : 'bg-white dark:bg-gray-700 shadow-lg text-gray-600 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-600 hover:text-stone-700 hover:shadow-xl'
      }`}
    >
      {isLeft ? <FiChevronLeft size={22} /> : <FiChevronRight size={22} />}
    </button>
  );
};

export default MyClubsCarousel;
