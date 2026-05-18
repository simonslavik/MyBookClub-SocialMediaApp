import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FiX, FiTrash2, FiBook } from 'react-icons/fi';
import apiClient from '@api/axios';
import logger from '@utils/logger';
import { getProfileImageUrl } from '@config/constants';
import { getAvatarUrl } from '@utils/avatar';
import { stripHtml } from '@utils/text';
import { useConfirm, useToast } from '@hooks/useUIFeedback';

const BookSuggestionDetailsModal = ({ suggestion, bookClubId, auth, members = [], userRole, onClose, onDeleted }: any) => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { toastError } = useToast();

  const suggesterId = suggestion.suggestedById || suggestion.suggestedBy?.id;
  const suggesterMember = members.find(m => m.id === suggesterId);
  const suggesterName = suggesterMember?.username || suggestion.suggestedBy?.name || 'Unknown';
  const suggesterImage = getProfileImageUrl(suggesterMember?.profileImage);

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

  const handleDelete = async () => {
    const ok = await confirm('Are you sure you want to delete this book suggestion?', { title: 'Delete Suggestion', variant: 'danger', confirmLabel: 'Delete' });
    if (!ok) return;

    try {
      await apiClient.delete(`/v1/bookclub/${bookClubId}/suggestions/${suggestion.id}`);
      onDeleted();
      onClose();
    } catch (err: any) {
      logger.error('Error deleting suggestion:', err);
      toastError(err.response?.data?.message || 'Failed to delete suggestion');
    }
  };

  const isOwnSuggestion = auth?.user?.id === suggestion.suggestedById;
  const isModerator = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'MODERATOR';
  const canDelete = isOwnSuggestion || isModerator;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Book suggestion details"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 w-full sm:max-w-2xl sm:max-h-[85vh] h-[92vh] sm:h-auto sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Suggestion details</h2>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Cover */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-32 h-48 rounded-lg bg-stone-100 dark:bg-gray-800 overflow-hidden shadow-md ring-1 ring-black/5 dark:ring-white/5 flex items-center justify-center">
                {suggestion.book?.coverUrl ? (
                  <img
                    src={suggestion.book.coverUrl}
                    alt={suggestion.book?.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                  />
                ) : (
                  <FiBook className="text-stone-400" size={32} />
                )}
              </div>
            </div>

            {/* Book metadata */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                {suggestion.book?.title}
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                by {suggestion.book?.author}
              </p>

              {/* Meta pills (pages / year) */}
              {(suggestion.book?.pageCount || suggestion.book?.publishedDate) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {suggestion.book?.pageCount && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-gray-800 text-xs font-medium text-stone-700 dark:text-stone-300">
                      {suggestion.book.pageCount} pages
                    </span>
                  )}
                  {suggestion.book?.publishedDate && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-gray-800 text-xs font-medium text-stone-700 dark:text-stone-300">
                      {new Date(suggestion.book.publishedDate).getFullYear()}
                    </span>
                  )}
                </div>
              )}

              {/* Reason — attributed speech bubble */}
              {suggestion.reason && (
                <div className="mt-4 p-3 rounded-xl bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200/60 dark:ring-gray-800">
                  <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Why this book</p>
                  <p className="text-sm italic text-stone-700 dark:text-stone-200 leading-relaxed">
                    &ldquo;{suggestion.reason}&rdquo;
                  </p>
                </div>
              )}

              {/* Suggester chip — clickable to profile */}
              <button
                onClick={() => navigate(`/profile/${suggesterId}`)}
                className="mt-4 inline-flex items-center gap-2 -ml-1 px-2 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors group"
              >
                <img
                  src={suggesterImage || getAvatarUrl(suggesterId)}
                  alt={suggesterName}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-stone-200 dark:ring-gray-700 group-hover:ring-stone-400 dark:group-hover:ring-stone-500 transition-all"
                  onError={(e) => { (e.target as HTMLImageElement).src = getAvatarUrl(suggesterId); }}
                />
                <span className="text-xs text-stone-500 dark:text-stone-400">Suggested by</span>
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100 group-hover:underline">{suggesterName}</span>
              </button>
            </div>
          </div>

          {/* Description */}
          {suggestion.book?.description && (
            <div className="mt-6 pt-5 border-t border-stone-100 dark:border-gray-800">
              <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-2">Description</p>
              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                {stripHtml(suggestion.book.description)}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-between items-center gap-2 px-5 py-3 border-t border-stone-100 dark:border-gray-800">
          {canDelete ? (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
              title={isOwnSuggestion ? 'Delete your suggestion' : 'Delete (moderator action)'}
            >
              <FiTrash2 size={13} />
              Delete suggestion
            </button>
          ) : <span />}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BookSuggestionDetailsModal;
