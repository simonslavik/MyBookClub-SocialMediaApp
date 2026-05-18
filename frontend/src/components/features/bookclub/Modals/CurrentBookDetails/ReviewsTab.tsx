import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@context/index';
import { FiStar, FiTrash2 } from 'react-icons/fi';
import { FaStar, FaRegStar } from 'react-icons/fa';
import apiClient from '@api/axios';
import logger from '@utils/logger';
import { getProfileImageUrl } from '@config/constants';
import { getAvatarUrl } from '@utils/avatar';
import { useConfirm, useToast } from '@hooks/useUIFeedback';

const ReviewsTab = ({ currentBookData, members = [] }: any) => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { toastSuccess, toastError, toastWarning } = useToast();

  const [reviews, setReviews] = useState<any[]>([]);
  const [myReview, setMyReview] = useState<any | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [averageRating, setAverageRating] = useState(0);

  const fetchRatings = async () => {
    if (!currentBookData?.id || !currentBookData?.bookClubId) return;
    setLoadingReviews(true);
    try {
      const { data } = await apiClient.get(
        `/v1/bookclub/${currentBookData.bookClubId}/books/${currentBookData.id}/ratings`,
      );
      if (data.success) {
        setReviews(data.data.ratings || []);
        setAverageRating(data.data.averageRating || 0);
        if (auth?.user) {
          const userRating = data.data.ratings.find((r: any) => r.userId === auth.user.id);
          if (userRating) {
            setMyReview(userRating);
            setRating(userRating.rating);
            setReviewText(userRating.reviewText || '');
          }
        }
      }
    } catch (err) {
      logger.error('Error fetching ratings:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [currentBookData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveReview = async () => {
    if (!currentBookData?.id || !currentBookData?.bookClubId || !auth?.token || rating === 0) {
      toastWarning('Please select a rating');
      return;
    }
    setSavingReview(true);
    try {
      const { data } = await apiClient.post(
        `/v1/bookclub/${currentBookData.bookClubId}/books/${currentBookData.id}/rate`,
        { rating, reviewText: reviewText || null },
      );
      if (data.success) {
        setMyReview(data.data.userRating);
        await fetchRatings();
        toastSuccess('Rating saved!');
      }
    } catch (err) {
      logger.error('Error saving rating:', err);
      toastError('Failed to save rating');
    } finally {
      setSavingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!currentBookData?.id || !currentBookData?.bookClubId || !auth?.token) return;
    const ok = await confirm('Are you sure you want to delete your rating?', {
      title: 'Delete Rating', variant: 'danger', confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      const { data } = await apiClient.delete(
        `/v1/bookclub/${currentBookData.bookClubId}/books/${currentBookData.id}/rate`,
      );
      if (data.success) {
        setMyReview(null);
        setRating(0);
        setReviewText('');
        await fetchRatings();
      }
    } catch (err) {
      logger.error('Error deleting rating:', err);
      toastError('Failed to delete rating');
    }
  };

  if (loadingReviews) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Your Rating */}
      <div className="p-4 rounded-xl bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200/60 dark:ring-gray-800 mb-5">
        <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-3">
          {myReview ? 'Your rating' : 'Rate this book'}
        </p>

        <div className="flex items-center gap-3 mb-3" onMouseLeave={() => setHoverRating(0)}>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = star <= (hoverRating || rating);
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => setRating(star)}
                  className="p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                >
                  {filled
                    ? <FaStar className="text-2xl text-amber-400" />
                    : <FaRegStar className="text-2xl text-stone-300 dark:text-stone-600" />}
                </button>
              );
            })}
          </div>
          {rating > 0 && (
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300 tabular-nums">{rating}/5</span>
          )}
        </div>

        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 ring-1 ring-stone-200 dark:ring-gray-700 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition resize-none mb-3"
          placeholder="Write a review (optional)…"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveReview}
            disabled={savingReview || rating === 0}
            className="px-4 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {savingReview && <span className="w-3 h-3 border-2 border-current border-r-transparent rounded-full animate-spin" />}
            {savingReview ? 'Saving…' : myReview ? 'Update' : 'Submit'}
          </button>
          {myReview && (
            <button
              onClick={handleDeleteReview}
              className="p-2 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
              title="Delete rating"
            >
              <FiTrash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* All Ratings */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400">
            All ratings ({reviews.length})
          </p>
          {reviews.length > 0 && (
            <div className="inline-flex items-center gap-1 text-xs text-stone-700 dark:text-stone-300">
              <FaStar className="text-amber-400" size={11} />
              <span className="font-semibold tabular-nums">{averageRating.toFixed(1)}</span>
              <span className="text-stone-400 dark:text-stone-500">avg</span>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-10 rounded-xl bg-stone-50 dark:bg-gray-800/40 ring-1 ring-stone-200/60 dark:ring-gray-800">
            <FiStar className="mx-auto text-stone-300 dark:text-stone-600 mb-2" size={24} />
            <p className="text-sm text-stone-500 dark:text-stone-400">No ratings yet. Be the first.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white dark:bg-gray-900 ring-1 ring-stone-200/60 dark:ring-gray-800 divide-y divide-stone-100 dark:divide-gray-800 overflow-hidden">
            {reviews.map((review) => {
              const isMe = review.userId === auth?.user?.id;
              const member = members.find((m: any) => m.id === review.userId);
              const memberName = isMe ? 'You' : (member?.username || `User ${review.userId.slice(0, 8)}`);
              const profileImg = getProfileImageUrl(member?.profileImage);
              return (
                <div key={review.id} className={`flex items-start gap-3 px-3 py-2.5 ${isMe ? 'bg-stone-50 dark:bg-gray-800/40' : ''}`}>
                  <img
                    src={profileImg || getAvatarUrl(review.userId)}
                    alt={memberName}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-900 cursor-pointer hover:ring-stone-300 dark:hover:ring-stone-500 transition-all"
                    onClick={() => navigate(`/profile/${review.userId}`)}
                    onError={(e) => { (e.target as HTMLImageElement).src = getAvatarUrl(review.userId); }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-semibold cursor-pointer hover:underline text-stone-900 dark:text-stone-100"
                        onClick={() => navigate(`/profile/${review.userId}`)}
                      >
                        {memberName}
                      </span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FaStar
                            key={star}
                            size={11}
                            className={star <= review.rating ? 'text-amber-400' : 'text-stone-300 dark:text-stone-600'}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-stone-400 dark:text-stone-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {review.reviewText && (
                      <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 whitespace-pre-line leading-relaxed">
                        {review.reviewText}
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

export default ReviewsTab;
