import { useState } from 'react';
import {
  FiExternalLink, FiClock, FiUsers, FiEdit2, FiTrash2,
  FiCheck, FiHelpCircle, FiXCircle, FiMoreVertical,
} from 'react-icons/fi';
import { getProfileImageUrl } from '@config/constants';
import { getAvatarUrl, getAvatarSeed } from '@utils/avatar';

/**
 * Platform metadata — emoji + label only. The previous version paired
 * each platform with a saturated `bg-gradient-to-r from-X-600 to-X-700`
 * pill (indigo, green, violet…). Those gradients didn't trigger the
 * warm-theme `text-white` exception (the class string doesn't contain
 * `bg-X-6` as a substring), so the label rendered as BLACK text on a
 * dark gradient — unreadable. Switched to a single monochrome stone
 * pill for every platform so it stays legible regardless of theme.
 */
const PLATFORM_META: Record<string, { icon: string; label: string }> = {
  zoom:        { icon: '📹', label: 'Zoom' },
  google_meet: { icon: '🟢', label: 'Google Meet' },
  teams:       { icon: '🟣', label: 'Teams' },
  discord:     { icon: '🎮', label: 'Discord' },
  custom:      { icon: '🔗', label: 'Meeting' },
};

const RSVP_BUTTONS = [
  { status: 'ATTENDING',     label: 'Going', Icon: FiCheck,      selectedClass: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' },
  { status: 'MAYBE',         label: 'Maybe', Icon: FiHelpCircle, selectedClass: 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700' },
  { status: 'NOT_ATTENDING', label: "Can't", Icon: FiXCircle,    selectedClass: 'bg-red-600 text-white border-red-600 hover:bg-red-700' },
] as const;

const MeetingCard = ({ meeting, currentUserId, allMembers, onRSVP, onEdit, onDelete, canManage }: any) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);

  const platform = PLATFORM_META[meeting.platform] || PLATFORM_META.custom;
  const scheduledDate = new Date(meeting.scheduledAt);
  const now = new Date();
  const isLive = meeting.status === 'LIVE';
  const isEnded = meeting.status === 'ENDED';
  const isCancelled = meeting.status === 'CANCELLED';

  const minutesUntil = (scheduledDate.getTime() - now.getTime()) / 60000;
  const isStartingSoon = minutesUntil > 0 && minutesUntil <= 15;

  const userRsvp = meeting.rsvps?.find((r: any) => r.userId === currentUserId);
  const attendingCount = meeting.rsvps?.filter((r: any) => r.status === 'ATTENDING').length || 0;
  const maybeCount = meeting.rsvps?.filter((r: any) => r.status === 'MAYBE').length || 0;
  const host = allMembers?.find((m: any) => m.id === meeting.hostId);

  const handleRsvp = async (status: string) => {
    setRsvpLoading(status);
    try {
      if (userRsvp?.status === status) await onRSVP(meeting.id, null); // cancel
      else await onRSVP(meeting.id, status);
    } finally {
      setRsvpLoading(null);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // One ring/border tone per state, instead of state-specific saturated
  // bg/border combos that fight the warm-theme palette. The status pill
  // on the header strip carries the colour signal — the card itself
  // stays clean.
  const ringClass = isLive
    ? 'ring-2 ring-emerald-500/70'
    : isStartingSoon
    ? 'ring-2 ring-amber-500/70'
    : 'ring-1 ring-black/5 dark:ring-white/10';

  const opacityClass = isCancelled ? 'opacity-60' : isEnded ? 'opacity-75' : '';

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-md ${ringClass} ${opacityClass} transition-all`}
    >
      {/* Status strip — only visible for Live or Starting soon */}
      {(isLive || isStartingSoon) && (
        <div
          className={`px-4 py-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
            isLive
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-500 text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          {isLive ? 'Live now' : `Starting in ${Math.ceil(minutesUntil)} min`}
        </div>
      )}

      <div className="p-5">
        {/* Header: title + description + manage menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3
              className={`font-semibold text-base leading-snug ${
                isEnded || isCancelled
                  ? 'text-stone-500 dark:text-stone-400 line-through'
                  : 'text-stone-900 dark:text-stone-100'
              }`}
            >
              {meeting.title}
            </h3>
            {meeting.description && (
              <p className="text-stone-600 dark:text-stone-300 text-sm mt-1 line-clamp-2 leading-relaxed">
                {meeting.description}
              </p>
            )}
          </div>

          {canManage && !isEnded && !isCancelled && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-stone-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-stone-500 dark:text-stone-400"
                aria-label="Meeting actions"
              >
                <FiMoreVertical size={16} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-9 bg-white dark:bg-gray-900 rounded-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 z-50 py-1 w-36 overflow-hidden">
                    <button
                      onClick={() => { setShowMenu(false); onEdit?.(meeting); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); onDelete?.(meeting.id); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <FiTrash2 size={14} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Meta row: when, platform, host */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-stone-600 dark:text-stone-300">
          <span className="inline-flex items-center gap-1.5">
            <FiClock size={14} className="flex-shrink-0 text-stone-400 dark:text-stone-500" />
            <span className="font-medium">{formatDate(scheduledDate)}</span>
            <span className="text-stone-400 dark:text-stone-500">·</span>
            <span>{formatTime(scheduledDate)}</span>
            {meeting.duration && <span className="text-stone-400 dark:text-stone-500">· {meeting.duration} min</span>}
          </span>

          {/* Platform pill — monochrome stone with emoji.
              No saturated gradient (the cause of the unreadable-black-text bug). */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 dark:bg-gray-700 text-stone-700 dark:text-stone-200">
            <span>{platform.icon}</span>
            {platform.label}
          </span>

          {host && (
            <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
              <span>Hosted by</span>
              <img
                src={getProfileImageUrl(host.profileImage) || getAvatarUrl(getAvatarSeed(host))}
                alt=""
                className="w-4 h-4 rounded-full object-cover ring-1 ring-stone-200 dark:ring-gray-600"
              />
              <span className="font-medium text-stone-700 dark:text-stone-200">{host.username}</span>
            </span>
          )}
        </div>

        {/* RSVP + Join row */}
        {!isEnded && !isCancelled && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-stone-200 dark:border-gray-700">
            {/* RSVP pills — unselected state is monochrome stone; selected
                state lights up in the answer-specific colour (emerald /
                amber / red) with white text. */}
            <div className="flex items-center gap-1.5">
              {RSVP_BUTTONS.map(({ status, label, Icon, selectedClass }) => {
                const isSelected = userRsvp?.status === status;
                return (
                  <button
                    key={status}
                    onClick={() => handleRsvp(status)}
                    disabled={rsvpLoading !== null}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? selectedClass
                        : 'bg-stone-50 dark:bg-gray-700/60 border-stone-200 dark:border-gray-600 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAttendees(!showAttendees)}
                className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
              >
                <FiUsers size={13} />
                <span><span className="font-semibold tabular-nums">{attendingCount}</span> going{maybeCount > 0 && <>, <span className="tabular-nums">{maybeCount}</span> maybe</>}</span>
              </button>

              <a
                href={meeting.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm ${
                  isLive
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                    : isStartingSoon
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900'
                }`}
              >
                <FiExternalLink size={14} />
                {isLive ? 'Join now' : 'Join'}
              </a>
            </div>
          </div>
        )}

        {/* Cancelled / Ended pill */}
        {(isEnded || isCancelled) && (
          <div className="mt-3 pt-3 border-t border-stone-200 dark:border-gray-700">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isCancelled
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                  : 'bg-stone-100 dark:bg-gray-700 text-stone-700 dark:text-stone-200'
              }`}
            >
              {isCancelled ? 'Cancelled' : 'Ended'}
            </span>
          </div>
        )}
      </div>

      {/* Attendees expanded panel */}
      {showAttendees && (
        <div className="border-t border-stone-200 dark:border-gray-700 px-5 py-4 bg-stone-50 dark:bg-gray-900/50">
          <div className="space-y-3">
            {(['ATTENDING', 'MAYBE', 'NOT_ATTENDING'] as const).map((status) => {
              const rsvps = meeting.rsvps?.filter((r: any) => r.status === status) || [];
              if (rsvps.length === 0) return null;
              const labelMap: Record<string, string> = {
                ATTENDING: '✅ Going',
                MAYBE: '🤔 Maybe',
                NOT_ATTENDING: "❌ Can't make it",
              };
              return (
                <div key={status}>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
                    {labelMap[status]} ({rsvps.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {rsvps.map((r: any) => {
                      const member = allMembers?.find((m: any) => m.id === r.userId);
                      return (
                        <div
                          key={r.userId}
                          className="flex items-center gap-1.5 bg-white dark:bg-gray-700 px-2.5 py-1 rounded-full ring-1 ring-stone-200 dark:ring-gray-600"
                        >
                          <img
                            src={getProfileImageUrl(member?.profileImage) || getAvatarUrl(r.userId)}
                            alt=""
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="text-xs text-stone-700 dark:text-stone-200 font-medium">
                            {member?.username || 'Unknown'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingCard;
