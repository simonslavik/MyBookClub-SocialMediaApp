import { useState, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '@context/index';
import { FiX, FiCalendar, FiBook, FiStar, FiTrash2, FiTrendingUp } from 'react-icons/fi';
import apiClient from '@api/axios';
import logger from '@utils/logger';
import { useConfirm, useToast } from '@hooks/useUIFeedback';

import DetailsTab from './CurrentBookDetails/DetailsTab';
import ScheduleTab from './CurrentBookDetails/ScheduleTab';
import ReviewsTab from './CurrentBookDetails/ReviewsTab';
import ProgressTab from './CurrentBookDetails/ProgressTab';

const TABS = [
  { key: 'details',  label: 'Details',  icon: FiBook },
  { key: 'progress', label: 'Progress', icon: FiTrendingUp },
  { key: 'schedule', label: 'Schedule', icon: FiCalendar },
  { key: 'reviews',  label: 'Reviews',  icon: FiStar },
] as const;

type TabKey = typeof TABS[number]['key'];

const CurrentBookDetailsModal = ({
  bookClubId,
  currentBookData,
  members = [],
  onClose,
  onBookUpdated,
  onBookRemoved,
}: any) => {
  const { auth } = useContext(AuthContext);
  const { confirm } = useConfirm();
  const { toastSuccess, toastError } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [submitting, setSubmitting] = useState(false);

  const book = currentBookData?.book;

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

  const handleUpdateSchedule = async (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return;
    setSubmitting(true);
    try {
      const { data } = await apiClient.patch(
        `/v1/bookclub/${currentBookData.bookClubId}/books/${currentBookData.bookId}`,
        { startDate, endDate },
      );
      if (data.success) {
        onBookUpdated(data.data);
        toastSuccess('Schedule updated successfully!');
      } else {
        toastError(data.error || 'Failed to update schedule');
      }
    } catch (err) {
      logger.error('Error updating schedule:', err);
      toastError('Failed to update schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveBook = async () => {
    const ok = await confirm(
      'Are you sure you want to remove this book as the current reading?',
      { title: 'Remove Book', variant: 'danger', confirmLabel: 'Remove' },
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      const { data } = await apiClient.delete(
        `/v1/bookclub/${currentBookData.bookClubId}/books/${currentBookData.bookId}`,
      );
      if (data.success) {
        onBookRemoved();
        onClose();
      } else {
        toastError(data.error || 'Failed to remove book');
      }
    } catch (err) {
      logger.error('Error removing book:', err);
      toastError('Failed to remove book');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Current book"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 w-full sm:max-w-3xl sm:max-h-[88vh] h-[94vh] sm:h-auto sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Current book</h2>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-stone-100 dark:border-gray-800 flex-shrink-0 overflow-x-auto scrollbar-hide">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 sm:flex-initial min-w-[100px] px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px inline-flex items-center justify-center gap-1.5 ${
                  active
                    ? 'text-stone-900 dark:text-stone-100 border-stone-900 dark:border-stone-100'
                    : 'text-stone-500 dark:text-stone-400 border-transparent hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-gray-800/40'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {activeTab === 'details'  && <DetailsTab book={book} currentBookData={currentBookData} />}
          {activeTab === 'progress' && <ProgressTab currentBookData={currentBookData} book={book} members={members} />}
          {activeTab === 'schedule' && <ScheduleTab currentBookData={currentBookData} book={book} onUpdateSchedule={handleUpdateSchedule} submitting={submitting} />}
          {activeTab === 'reviews'  && <ReviewsTab currentBookData={currentBookData} members={members} />}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 dark:border-gray-800 px-5 py-3 flex justify-between items-center flex-shrink-0">
          <button
            onClick={handleRemoveBook}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiTrash2 size={13} />
            Remove book
          </button>
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

export default CurrentBookDetailsModal;
