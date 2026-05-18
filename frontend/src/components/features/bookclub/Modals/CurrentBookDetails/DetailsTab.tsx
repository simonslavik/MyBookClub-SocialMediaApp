import { FiBook } from 'react-icons/fi';
import { stripHtml } from '@utils/text';

const DetailsTab = ({ book, currentBookData }: any) => (
  <div className="max-w-3xl mx-auto">
    {/* Cover + metadata */}
    <div className="flex flex-col sm:flex-row gap-5 mb-5">
      <div className="flex-shrink-0 mx-auto sm:mx-0">
        <div className="w-32 h-48 rounded-lg bg-stone-100 dark:bg-gray-800 overflow-hidden shadow-md ring-1 ring-black/5 dark:ring-white/5 flex items-center justify-center">
          {book?.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book?.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
            />
          ) : (
            <FiBook className="text-stone-400" size={32} />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 leading-snug">{book?.title}</h3>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">by {book?.author}</p>

        <dl className="mt-4 space-y-1.5 text-xs">
          {book?.pageCount && (
            <div className="flex gap-3">
              <dt className="text-stone-500 dark:text-stone-400 min-w-[80px] uppercase tracking-wider font-semibold text-[11px]">Pages</dt>
              <dd className="text-stone-800 dark:text-stone-200 tabular-nums">{book.pageCount}</dd>
            </div>
          )}
          {book?.publishedDate && (
            <div className="flex gap-3">
              <dt className="text-stone-500 dark:text-stone-400 min-w-[80px] uppercase tracking-wider font-semibold text-[11px]">Published</dt>
              <dd className="text-stone-800 dark:text-stone-200">{book.publishedDate}</dd>
            </div>
          )}
          {book?.isbn && (
            <div className="flex gap-3">
              <dt className="text-stone-500 dark:text-stone-400 min-w-[80px] uppercase tracking-wider font-semibold text-[11px]">ISBN</dt>
              <dd className="text-stone-800 dark:text-stone-200 font-mono">{book.isbn}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>

    {/* Description — strip Google Books HTML before render */}
    {book?.description && (
      <div className="mt-6 pt-5 border-t border-stone-100 dark:border-gray-800">
        <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-2">About this book</p>
        <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
          {stripHtml(book.description)}
        </p>
      </div>
    )}

    {/* Reading Timeline */}
    <div className="mt-5 p-4 rounded-xl bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200/60 dark:ring-gray-800">
      <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-3">Reading Timeline</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-0.5">Started</p>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            {currentBookData?.startDate
              ? new Date(currentBookData.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-0.5">Target completion</p>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            {currentBookData?.endDate
              ? new Date(currentBookData.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : '—'}
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default DetailsTab;
