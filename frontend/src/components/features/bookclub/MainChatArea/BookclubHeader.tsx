import { useEffect, useRef, useState } from 'react';
import { FiHash, FiSettings, FiCalendar, FiUserPlus, FiVideo, FiMoreVertical, FiLogOut } from 'react-icons/fi';

const BookclubHeader = ({
  showBooksHistory,
  showCalendar,
  showSuggestions,
  showMeetings,
  showSettings,
  currentRoom,
  auth,
  onInviteClick,
  onSettingsClick,
  onLeaveClick,
  bookClubName,
  userRole,
  pendingRequestsCount = 0,
}: any) => {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 flex items-center justify-between min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        {showBooksHistory ? (
          <h2 className="text-white font-semibold text-sm truncate">Books History</h2>
        ) : showCalendar ? (
          <>
            <FiCalendar className="text-gray-400 flex-shrink-0" size={14} />
            <h2 className="text-white font-semibold text-sm truncate">Calendar</h2>
          </>
        ) : showSuggestions ? (
          <h2 className="text-white font-semibold text-sm truncate">Suggestions & Voting</h2>
        ) : showMeetings ? (
          <>
            <FiVideo className="text-indigo-500 flex-shrink-0" size={14} />
            <h2 className="text-white font-semibold text-sm truncate">Meetings</h2>
          </>
        ) : (
          <>
            <FiHash className="text-gray-400 flex-shrink-0" size={14} />
            <h2 className="text-white font-semibold text-sm truncate">{currentRoom?.name}</h2>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {auth?.user && (
          <button
            onClick={onInviteClick}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded-md transition-colors text-xs"
            title="Invite people"
          >
            <FiUserPlus size={14} />
            <span className="hidden sm:inline">Invite</span>
          </button>
        )}

        {auth?.user && !showSettings && (userRole === 'OWNER' || userRole === 'ADMIN') && (
          <button
            onClick={onSettingsClick}
            className="relative text-gray-400 hover:text-white transition-colors p-1"
            title={pendingRequestsCount > 0 ? `${pendingRequestsCount} pending join request${pendingRequestsCount === 1 ? '' : 's'}` : 'Bookclub Settings'}
          >
            <FiSettings size={18} />
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 text-white text-[10px] items-center justify-center font-semibold">
                  {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                </span>
              </span>
            )}
          </button>
        )}

        {/* "More" menu — visible to every member. Currently has just
            "Leave bookclub" (hidden for OWNER since backend rejects
            owner leaving — they have to delete or transfer ownership).
            Easy to extend with mute notifications, copy invite link,
            block, report, etc. */}
        {auth?.user && userRole && userRole !== 'OWNER' && (
          <MoreMenu
            bookClubName={bookClubName}
            onLeaveClick={onLeaveClick}
          />
        )}
      </div>
    </div>
  );
};

/**
 * 3-dot kebab menu for member-level actions. Lives in its own component
 * so the header's main flex row stays tidy and so we can add more
 * items later without touching the parent.
 */
function MoreMenu({ bookClubName, onLeaveClick }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-gray-400 hover:text-white transition-colors p-1"
        title="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FiMoreVertical size={18} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-30 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onLeaveClick?.(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <FiLogOut size={14} />
            <span>Leave {bookClubName || 'bookclub'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default BookclubHeader;
