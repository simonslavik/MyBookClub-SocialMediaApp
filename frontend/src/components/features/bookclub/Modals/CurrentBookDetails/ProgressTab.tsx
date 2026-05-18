import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@context/index';
import { FiTrash2, FiBookOpen } from 'react-icons/fi';
import apiClient from '@api/axios';
import logger from '@utils/logger';
import { getProfileImageUrl } from '@config/constants';
import { getAvatarUrl } from '@utils/avatar';
import { useConfirm, useToast } from '@hooks/useUIFeedback';

const ProgressTab = ({ currentBookData, book, members = [] }: any) => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { toastSuccess, toastError, toastWarning } = useToast();

  const [allProgress, setAllProgress] = useState<any[]>([]);
  const [myProgress, setMyProgress] = useState<any | null>(null);
  const [pagesRead, setPagesRead] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalPages = book?.pageCount || null;

  const fetchProgress = async () => {
    if (!currentBookData?.id) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/v1/bookclub-books/${currentBookData.id}/progress/all`);
      if (data.success) {
        const records = data.data?.progress || [];
        setAllProgress(records);
        if (auth?.user) {
          const mine = records.find((p: any) => p.userId === auth.user.id);
          if (mine) {
            setMyProgress(mine);
            setPagesRead(mine.pagesRead || 0);
            setNotes(mine.notes || '');
          } else {
            setMyProgress(null);
          }
        }
      }
    } catch (err) {
      logger.error('Error fetching reading progress:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [currentBookData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!currentBookData?.id || !auth?.token) return;
    if (pagesRead < 0) { toastWarning('Pages must be 0 or greater'); return; }
    if (totalPages && pagesRead > totalPages) { toastWarning(`Pages cannot exceed total (${totalPages})`); return; }
    setSaving(true);
    try {
      const { data } = await apiClient.post(
        `/v1/bookclub-books/${currentBookData.id}/progress`,
        { pagesRead, notes: notes || null },
      );
      if (data.success) {
        await fetchProgress();
        toastSuccess('Progress saved');
      }
    } catch (err) {
      logger.error('Error saving progress:', err);
      toastError('Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const ok = await confirm('Reset your reading progress for this book?', {
      title: 'Reset Progress', variant: 'danger', confirmLabel: 'Reset',
    });
    if (!ok) return;
    try {
      const { data } = await apiClient.delete(`/v1/bookclub-books/${currentBookData.id}/progress`);
      if (data.success) {
        setMyProgress(null);
        setPagesRead(0);
        setNotes('');
        await fetchProgress();
      }
    } catch (err) {
      logger.error('Error resetting progress:', err);
      toastError('Failed to reset progress');
    }
  };

  const myPercentage = totalPages ? Math.min(Math.round((pagesRead / totalPages) * 100), 100) : null;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* My Progress card */}
      <div className="p-4 rounded-xl bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200/60 dark:ring-gray-800 mb-5">
        <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-3">
          {myProgress ? 'Your progress' : 'Track your progress'}
        </p>

        {totalPages != null && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-300 mb-1.5">
              <span className="tabular-nums">{pagesRead} / {totalPages} pages</span>
              <span className="font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{myPercentage}%</span>
            </div>
            <div className="h-2 bg-stone-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-900 dark:bg-stone-100 transition-all"
                style={{ width: `${myPercentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Pages read</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={totalPages || undefined}
                value={pagesRead}
                onChange={(e) => setPagesRead(parseInt(e.target.value) || 0)}
                className="w-24 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 ring-1 ring-stone-200 dark:ring-gray-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition tabular-nums"
              />
              {totalPages != null && (
                <input
                  type="range"
                  min={0}
                  max={totalPages}
                  value={pagesRead}
                  onChange={(e) => setPagesRead(parseInt(e.target.value) || 0)}
                  className="flex-1 accent-stone-900 dark:accent-stone-100"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Where you are, thoughts so far…"
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 ring-1 ring-stone-200 dark:ring-gray-700 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {saving && <span className="w-3 h-3 border-2 border-current border-r-transparent rounded-full animate-spin" />}
              {saving ? 'Saving…' : myProgress ? 'Update' : 'Save'}
            </button>
            {myProgress && (
              <button
                onClick={handleReset}
                className="p-2 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                title="Reset progress"
              >
                <FiTrash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* All members' progress */}
      <div>
        <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-2">
          All readers ({allProgress.length})
        </p>

        {allProgress.length === 0 ? (
          <div className="text-center py-10 rounded-xl bg-stone-50 dark:bg-gray-800/40 ring-1 ring-stone-200/60 dark:ring-gray-800">
            <FiBookOpen className="mx-auto text-stone-300 dark:text-stone-600 mb-2" size={24} />
            <p className="text-sm text-stone-500 dark:text-stone-400">No progress logged yet. Be the first.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white dark:bg-gray-900 ring-1 ring-stone-200/60 dark:ring-gray-800 divide-y divide-stone-100 dark:divide-gray-800 overflow-hidden">
            {allProgress.map((p) => {
              const isMe = p.userId === auth?.user?.id;
              const member = members.find((m: any) => m.id === p.userId);
              const memberName = isMe ? 'You' : member?.username || `User ${p.userId.slice(0, 8)}`;
              const profileImg = getProfileImageUrl(member?.profileImage);
              const percentage = p.percentage;

              return (
                <div
                  key={p.id}
                  className={`flex items-start gap-3 px-3 py-2.5 ${isMe ? 'bg-stone-50 dark:bg-gray-800/40' : ''}`}
                >
                  <img
                    src={profileImg || getAvatarUrl(p.userId)}
                    alt={memberName}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-900 cursor-pointer hover:ring-stone-300 dark:hover:ring-stone-500 transition-all"
                    onClick={() => navigate(`/profile/${p.userId}`)}
                    onError={(e) => { (e.target as HTMLImageElement).src = getAvatarUrl(p.userId); }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-semibold cursor-pointer hover:underline text-stone-900 dark:text-stone-100"
                        onClick={() => navigate(`/profile/${p.userId}`)}
                      >
                        {memberName}
                      </span>
                      <span className="text-[11px] text-stone-400 dark:text-stone-500">
                        {p.lastReadDate ? new Date(p.lastReadDate).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <div className="mt-1.5">
                      <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 mb-0.5 tabular-nums">
                        <span>{p.pagesRead}{totalPages ? ` / ${totalPages}` : ''} pages</span>
                        {percentage != null && (
                          <span className="font-semibold text-stone-900 dark:text-stone-100">{percentage}%</span>
                        )}
                      </div>
                      <div className="h-1.5 bg-stone-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-stone-900 dark:bg-stone-100 transition-all"
                          style={{ width: `${percentage ?? 0}%` }}
                        />
                      </div>
                    </div>

                    {p.notes && (
                      <p className="text-xs text-stone-600 dark:text-stone-300 mt-1.5 whitespace-pre-line leading-relaxed">
                        {p.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTab;
