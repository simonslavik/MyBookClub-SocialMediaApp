import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiLink, FiExternalLink, FiCheck } from 'react-icons/fi';
import { SiZoom, SiGooglemeet, SiJitsi } from 'react-icons/si';
import { bookclubAPI } from '@api/bookclub.api';
import logger from '@utils/logger';

const PLATFORMS = [
  { value: 'zoom',        label: 'Zoom',        icon: '📹' },
  { value: 'google_meet', label: 'Google Meet', icon: '🟢' },
  { value: 'teams',       label: 'Teams',       icon: '🟣' },
  { value: 'discord',     label: 'Discord',     icon: '🎮' },
  { value: 'custom',      label: 'Other',       icon: '🔗' },
] as const;

// Quick-create shortcuts: open the provider in a new tab, user creates a
// meeting there, then comes back and pastes the link.
const QUICK_CREATE = [
  { label: 'Google Meet', icon: SiGooglemeet, url: 'https://meet.new',                    hint: 'Instant meeting' },
  { label: 'Zoom',        icon: SiZoom,       url: 'https://zoom.us/start/videomeeting',  hint: 'Sign-in required' },
  { label: 'Jitsi',       icon: SiJitsi,      url: 'https://meet.jit.si',                 hint: 'No account needed' },
];

const DURATION_OPTIONS = [
  { value: 15,  label: '15 min' },
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

function detectPlatform(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes('zoom.us') || lower.includes('zoom.com')) return 'zoom';
  if (lower.includes('meet.google.com')) return 'google_meet';
  if (lower.includes('teams.microsoft.com') || lower.includes('teams.live.com')) return 'teams';
  if (lower.includes('discord.gg') || lower.includes('discord.com')) return 'discord';
  return 'custom';
}

const ScheduleMeetingModal = ({ isOpen, onClose, bookClubId, meeting = null, onMeetingSaved }: any) => {
  const isEditing = !!meeting;

  const [form, setForm] = useState({
    title: '',
    description: '',
    meetingUrl: '',
    platform: 'custom',
    scheduledAt: '',
    duration: 60,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  // Reset form whenever modal opens (with edit data, or with defaults).
  useEffect(() => {
    if (!isOpen) return;
    if (meeting) {
      const dt = new Date(meeting.scheduledAt);
      const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setForm({
        title: meeting.title || '',
        description: meeting.description || '',
        meetingUrl: meeting.meetingUrl || '',
        platform: meeting.platform || 'custom',
        scheduledAt: localIso,
        duration: meeting.duration || 60,
      });
    } else {
      // Default to 1 hour from now, rounded to the next 15-min mark
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15 + 60);
      now.setSeconds(0);
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setForm({
        title: '',
        description: '',
        meetingUrl: '',
        platform: 'custom',
        scheduledAt: localIso,
        duration: 60,
      });
    }
    setError('');
  }, [isOpen, meeting]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setForm(prev => ({
      ...prev,
      meetingUrl: url,
      platform: url.trim() ? detectPlatform(url) : prev.platform,
    }));
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    if (!form.meetingUrl.trim()) return setError('Meeting URL is required');
    if (!form.scheduledAt) return setError('Date & time is required');

    try { new URL(form.meetingUrl); } catch { return setError('Please enter a valid URL'); }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        meetingUrl: form.meetingUrl.trim(),
        platform: form.platform,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        duration: form.duration || undefined,
      };

      if (isEditing) {
        const { meeting: updated } = await bookclubAPI.updateMeeting(bookClubId, meeting.id, payload);
        onMeetingSaved?.(updated);
      } else {
        const { meeting: created } = await bookclubAPI.createMeeting(bookClubId, payload);
        onMeetingSaved?.(created);
      }
      onClose();
    } catch (err: any) {
      logger.error('Error saving meeting:', err);
      setError(err.response?.data?.error || 'Failed to save meeting');
    } finally {
      setSaving(false);
    }
  }, [form, isEditing, bookClubId, meeting, onMeetingSaved, onClose]);

  if (!isOpen) return null;

  const activePlatform = PLATFORMS.find(p => p.value === form.platform);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Edit meeting' : 'Schedule meeting'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:max-h-[90vh] h-[94vh] sm:h-auto sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-gray-800 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 truncate">
              {isEditing ? 'Edit meeting' : 'Schedule a meeting'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {isEditing ? 'Update meeting details — members get notified.' : 'Pick a time, drop the link, the club gets notified.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            {error && (
              <div role="alert" className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="meeting-title" className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
                Title
              </label>
              <input
                id="meeting-title"
                type="text"
                value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Book Discussion: Chapters 5–8"
                maxLength={200}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
              />
            </div>

            {/* Meeting URL */}
            <div>
              <label htmlFor="meeting-url" className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
                Meeting link
              </label>
              <div className="relative">
                <FiLink className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                <input
                  id="meeting-url"
                  type="url"
                  value={form.meetingUrl}
                  onChange={handleUrlChange}
                  placeholder="https://zoom.us/j/123… or https://meet.google.com/abc-defg-hij"
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
                />
              </div>

              {/* Quick-create shortcuts — only show when URL is empty */}
              {!form.meetingUrl.trim() && (
                <div className="mt-2.5">
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-1.5">
                    No link yet? Spin one up:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_CREATE.map(({ label, icon: Icon, url, hint }) => (
                      <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={hint}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-stone-700 dark:text-stone-200 text-xs font-medium transition-colors"
                      >
                        <Icon size={14} />
                        <span>{label}</span>
                        <FiExternalLink size={10} className="text-stone-400 dark:text-stone-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected platform pill */}
              {form.meetingUrl.trim() && activePlatform && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-gray-800 text-xs text-stone-700 dark:text-stone-200">
                  <FiCheck size={11} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Detected:</span>
                  <span className="font-semibold">{activePlatform.icon} {activePlatform.label}</span>
                </div>
              )}
            </div>

            {/* Date & Time + Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="meeting-dt" className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
                  Date &amp; time
                </label>
                <input
                  id="meeting-dt"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
                  className="w-full px-3 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
                />
              </div>
              <div>
                <label htmlFor="meeting-dur" className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
                  Duration
                </label>
                <select
                  id="meeting-dur"
                  value={form.duration}
                  onChange={(e) => setForm(p => ({ ...p, duration: Number(e.target.value) }))}
                  className="w-full px-3 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_1rem_center] pr-10"
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="meeting-desc" className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
                Description <span className="font-normal normal-case tracking-normal text-stone-400 dark:text-stone-500">(optional)</span>
              </label>
              <textarea
                id="meeting-desc"
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What will we cover?"
                maxLength={1000}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition resize-none"
              />
            </div>
          </form>
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-stone-100 dark:border-gray-800 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {saving && <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Schedule meeting'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ScheduleMeetingModal;
