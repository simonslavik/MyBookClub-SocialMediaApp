import { useState, useMemo } from 'react';
import { FiEdit2 } from 'react-icons/fi';

const deriveSchedule = (currentBookData: any) => {
  let start = '';
  let end = '';
  let days = 30;
  if (currentBookData?.startDate) start = new Date(currentBookData.startDate).toISOString().split('T')[0];
  if (currentBookData?.endDate) end = new Date(currentBookData.endDate).toISOString().split('T')[0];
  if (currentBookData?.startDate && currentBookData?.endDate) {
    const diffMs = Math.abs(new Date(currentBookData.endDate).getTime() - new Date(currentBookData.startDate).getTime());
    days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
  return { start, end, days };
};

const ScheduleTab = ({ currentBookData, book, onUpdateSchedule, submitting }: any) => {
  const initial = useMemo(() => deriveSchedule(currentBookData), [currentBookData]);

  const [editingSchedule, setEditingSchedule] = useState(false);
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [readingDays, setReadingDays] = useState(initial.days);

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (value && readingDays > 0) {
      const d = new Date(value);
      d.setDate(d.getDate() + readingDays);
      setEndDate(d.toISOString().split('T')[0]);
    }
  };

  const handleReadingDaysChange = (value: string) => {
    const days = parseInt(value) || 0;
    setReadingDays(days);
    if (startDate && days > 0) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + days);
      setEndDate(d.toISOString().split('T')[0]);
    }
  };

  const calculateDaysRemaining = () => {
    if (!currentBookData?.endDate) return 0;
    const now = new Date();
    const diffDays = Math.ceil((new Date(currentBookData.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const calculatePagesPerDay = () => {
    if (!book?.pageCount || !readingDays) return 0;
    return Math.ceil(book.pageCount / readingDays);
  };

  const handleSave = () => {
    onUpdateSchedule(startDate, endDate);
    setEditingSchedule(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400">Reading schedule</p>
        {!editingSchedule && (
          <button
            onClick={() => setEditingSchedule(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FiEdit2 size={12} />
            Edit
          </button>
        )}
      </div>

      {editingSchedule ? (
        <div className="space-y-4 p-4 rounded-xl bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200/60 dark:ring-gray-800">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 ring-1 ring-stone-200 dark:ring-gray-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
              Reading duration <span className="font-normal normal-case tracking-normal text-stone-400 dark:text-stone-500">— {readingDays} days</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="7"
                max="90"
                value={readingDays}
                onChange={(e) => handleReadingDaysChange(e.target.value)}
                className="flex-1 accent-stone-900 dark:accent-stone-100"
              />
              <input
                type="number"
                min="7"
                max="90"
                value={readingDays}
                onChange={(e) => handleReadingDaysChange(e.target.value)}
                className="w-16 px-2 py-1.5 rounded-lg bg-white dark:bg-gray-900 ring-1 ring-stone-200 dark:ring-gray-700 text-sm text-stone-900 dark:text-stone-100 text-center focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Target completion</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 ring-1 ring-stone-200 dark:ring-gray-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setEditingSchedule(false)}
              className="flex-1 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={submitting || !startDate || !endDate}
              className="flex-1 px-4 py-2 text-sm font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {submitting && <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200/60 dark:ring-gray-800">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-0.5">Start date</p>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {currentBookData?.startDate
                  ? new Date(currentBookData.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-0.5">End date</p>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {currentBookData?.endDate
                  ? new Date(currentBookData.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>

          {book?.pageCount && (
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-stone-200/60 dark:border-gray-800">
              <div className="text-center p-3 rounded-lg bg-white dark:bg-gray-900 ring-1 ring-stone-200/60 dark:ring-gray-800">
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">{calculatePagesPerDay()}</p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Pages per day</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white dark:bg-gray-900 ring-1 ring-stone-200/60 dark:ring-gray-800">
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">{calculateDaysRemaining()}</p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Days remaining</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleTab;
