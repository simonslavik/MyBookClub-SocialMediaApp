import { useState } from 'react';
import { FiSettings as FiSettingsIcon, FiLock, FiUnlock, FiEyeOff, FiImage, FiTrash2, FiX, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import { getCollabImageUrl, BOOKCLUB_CATEGORIES } from '@config/constants';
import { getBookclubCoverUrl, getBookclubSeed } from '@utils/avatar';
import AdminApprovalPanel from '@components/features/bookclub/AdminApprovalPanel';
import MemberManagement from '@components/features/bookclub/MemberManagement';

type Visibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';

const VISIBILITY_OPTIONS: Array<{
  key: Visibility; label: string; description: string; Icon: typeof FiUnlock;
}> = [
  { key: 'PUBLIC',      label: 'Public',      description: 'Anyone can find and join instantly',     Icon: FiUnlock },
  { key: 'PRIVATE',     label: 'Private',     description: 'Visible to everyone, joining is gated',  Icon: FiLock },
  { key: 'INVITE_ONLY', label: 'Invite only', description: 'Hidden from search, members invite-only', Icon: FiEyeOff },
];

/**
 * In-bookclub settings panel — opens when admin/owner clicks the gear
 * icon in the bookclub header. Mirrors the standalone /bookclubsettings
 * page's design system: light cards, stone-100 pill inputs, monochrome
 * stone-900 primary CTAs, danger zone in red.
 *
 * Previous version was the original dark gray-800 panel that fought the
 * warm-theme palette and produced unreadable white text on the
 * "bg-indigo-500/10" selected radio cards. Now uses explicit
 * stone-900/stone-100 instead of relying on `text-white` overrides.
 */
const BookclubSettingsPanel = ({
  bookClub,
  settingsForm,
  setSettingsForm,
  savingSettings,
  handleSaveSettings,
  uploadingImage,
  fileInputRef,
  handleImageUpload,
  handleDeleteImage,
  bookClubId,
  mappedBookClubMembers,
  userRole,
  auth,
  onMemberUpdate,
  onClose,
  onDeleteBookclub,
}: any) => {
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingBookclub, setDeletingBookclub] = useState(false);
  const isOwner = userRole === 'OWNER';
  const expectedConfirm = bookClub?.name || '';

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 dark:bg-gray-950 px-4 py-6 md:px-6 md:py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex w-9 h-9 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 items-center justify-center">
              <FiSettingsIcon size={16} />
            </span>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Bookclub settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close settings"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* General form */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-5 md:p-6 mb-5">
          <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-4">General</p>
          <form onSubmit={handleSaveSettings} className="space-y-5">
            {/* Cover image */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-2">Cover image</label>
              <div className="relative group w-28 h-28 md:w-32 md:h-32">
                {(() => {
                  const coverFallback = getBookclubCoverUrl(getBookclubSeed(bookClub));
                  return (
                    <img
                      src={bookClub?.imageUrl ? getCollabImageUrl(bookClub.imageUrl) : coverFallback}
                      alt={bookClub?.name}
                      className="w-full h-full object-cover rounded-xl ring-1 ring-black/5 dark:ring-white/10"
                      onError={(e) => { (e.target as HTMLImageElement).src = coverFallback; }}
                    />
                  );
                })()}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="px-2.5 py-1 bg-white/90 hover:bg-white text-stone-900 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <FiImage size={12} />
                    {uploadingImage ? '…' : 'Change'}
                  </button>
                  {bookClub?.imageUrl && (
                    <button
                      type="button"
                      onClick={handleDeleteImage}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      <FiTrash2 size={12} />
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Name */}
            <div>
              <label htmlFor="settings-name" className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Name</label>
              <input
                id="settings-name"
                type="text"
                value={settingsForm.name}
                onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="settings-desc" className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Description</label>
              <textarea
                id="settings-desc"
                value={settingsForm.description}
                onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="settings-category" className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Category</label>
              <select
                id="settings-category"
                value={settingsForm.category}
                onChange={(e) => setSettingsForm({ ...settingsForm, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_1rem_center] pr-10"
              >
                <option value="">Select a category</option>
                {BOOKCLUB_CATEGORIES.map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Visibility — same segmented radio-card pattern as the
                CreateBookclub page so behaviour is consistent. Selected
                state uses solid `bg-stone-900` (no opacity overlays) so
                we don't fight any `.text-white` overrides. */}
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-2">Visibility</p>
              <div className="space-y-2">
                {VISIBILITY_OPTIONS.map(({ key, label, description, Icon }) => {
                  const active = settingsForm.visibility === key;
                  return (
                    <label
                      key={key}
                      className={`relative flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${
                        active
                          ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 ring-2 ring-stone-900 dark:ring-stone-100'
                          : 'bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200 dark:ring-gray-800 hover:ring-stone-300 dark:hover:ring-gray-700 text-stone-700 dark:text-stone-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={key}
                        checked={active}
                        onChange={(e) => setSettingsForm({ ...settingsForm, visibility: e.target.value })}
                        className="sr-only"
                      />
                      <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-1 ${
                        active
                          ? 'bg-white dark:bg-stone-900 ring-transparent'
                          : 'bg-white dark:bg-gray-900 ring-stone-300 dark:ring-gray-700'
                      }`}>
                        {active && <FiCheck size={12} className="text-stone-900 dark:text-stone-100" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon size={14} className={active ? '' : 'opacity-60'} />
                          <span className="text-sm font-semibold">{label}</span>
                        </div>
                        <p className={`text-xs mt-0.5 ${active ? 'opacity-80' : 'opacity-70'}`}>
                          {description}
                        </p>

                        {/* Inline approval toggle — only when Private active */}
                        {key === 'PRIVATE' && active && (
                          <label
                            className="mt-3 flex items-center gap-2 text-xs cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={settingsForm.requiresApproval}
                              onChange={(e) => setSettingsForm({ ...settingsForm, requiresApproval: e.target.checked })}
                              className="w-3.5 h-3.5 accent-white dark:accent-stone-900"
                            />
                            <span>Require admin approval for join requests</span>
                          </label>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={savingSettings}
              className="w-full px-5 py-3 text-sm font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {savingSettings && <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
              {savingSettings ? 'Saving…' : 'Save settings'}
            </button>
          </form>
        </div>

        {/* Admin approval panel + Member management — these children
            still render in their own dark style; if they look off the
            same warm-theme overrides apply to them as the rest. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <AdminApprovalPanel bookclubId={bookClubId} userRole={userRole} />
        </div>

        <MemberManagement
          bookclub={{ ...bookClub, members: mappedBookClubMembers }}
          currentUserId={auth?.user?.id}
          currentUserRole={userRole}
          onMemberUpdate={onMemberUpdate}
        />

        {/* Danger zone — owner only */}
        {isOwner && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-red-200 dark:ring-red-900/40 p-5 md:p-6 mt-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 items-center justify-center flex-shrink-0">
                <FiAlertTriangle size={18} />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Delete bookclub</h3>
                <p className="text-sm text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  This will permanently delete <span className="font-semibold text-stone-900 dark:text-stone-100">{expectedConfirm}</span>,
                  including all rooms, messages, books, meetings and members. This action cannot be undone.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="delete-confirm" className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
                Type <span className="font-mono normal-case tracking-normal text-stone-900 dark:text-stone-100">{expectedConfirm}</span> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={expectedConfirm}
                className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 ring-1 ring-red-200/60 dark:ring-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
              />
            </div>

            <button
              type="button"
              onClick={async () => {
                setDeletingBookclub(true);
                try {
                  await onDeleteBookclub?.();
                } finally {
                  setDeletingBookclub(false);
                }
              }}
              disabled={deletingBookclub || deleteConfirmText !== expectedConfirm || !expectedConfirm}
              className="w-full px-5 py-3 text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors inline-flex items-center justify-center gap-2"
            >
              {deletingBookclub && <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
              <FiTrash2 size={14} />
              {deletingBookclub ? 'Deleting…' : 'Permanently delete bookclub'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookclubSettingsPanel;
