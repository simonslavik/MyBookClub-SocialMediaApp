import { FiX } from 'react-icons/fi';
import { ChatSkeleton, SidebarSkeleton } from '@components/common/Skeleton';

export const BookclubLoadingScreen = () => (
  <div className="flex h-screen bg-gray-900">
    <div className="w-[72px] bg-[#1a1a2e] border-r border-white/5"><SidebarSkeleton /></div>
    <div className="w-60 bg-[#1e1e2e] p-3 space-y-2">
      <div className="animate-pulse bg-white/10 h-8 rounded-lg mb-4" />
      {[...Array(5)].map((_, i) => <div key={i} className="animate-pulse bg-white/5 h-9 rounded-lg" />)}
    </div>
    <div className="flex-1 bg-[#12121c]">
      <div className="h-14 bg-[#1e1e2e] border-b border-white/5 animate-pulse" />
      <ChatSkeleton />
    </div>
  </div>
);

export const BookclubErrorScreen = ({ error, onRetry, onGoHome }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
        <FiX className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-200 mb-2 font-display">Failed to Load</h2>
      <p className="text-sm text-gray-400 mb-6 font-outfit">{error}</p>
      <div className="flex items-center justify-center gap-3">
        <button onClick={onRetry} className="px-5 py-2.5 bg-indigo-700 text-white rounded-xl text-sm font-semibold hover:bg-indigo-800 transition-colors font-outfit">
          Retry
        </button>
        <button onClick={onGoHome} className="px-5 py-2.5 bg-white/10 text-gray-300 rounded-xl text-sm font-medium hover:bg-white/15 transition-colors font-outfit">
          Go Home
        </button>
      </div>
    </div>
  </div>
);
