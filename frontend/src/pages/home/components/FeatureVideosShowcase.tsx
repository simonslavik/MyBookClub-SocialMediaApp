import { useEffect, useRef } from 'react';

/**
 * FeatureVideosShowcase — autoplay-in-viewport demo videos.
 *
 * Each card holds a short muted screen recording (.mov / .mp4) of a
 * core feature. Videos auto-play when scrolled into view via
 * IntersectionObserver (no audio so browsers allow autoplay) and pause
 * the moment they leave — saves battery + bandwidth on mobile and
 * prevents 4 simultaneous videos from chewing the user's GPU.
 *
 * The `playsInline` attr stops iOS Safari from punting to full-screen.
 * `preload="metadata"` fetches only the moov atom up front; the byte
 * stream loads when we hit play. Together that keeps Time-To-First-Byte
 * for the homepage flat regardless of how many videos sit below.
 */
const VIDEOS = [
  {
    src: '/videos/demo-create-bookclub.mov',
    title: 'Create a book club',
    caption: 'Spin up a new club with cover, category, and visibility in seconds.',
  },
  {
    src: '/videos/demo-add-suggestion.mov',
    title: 'Suggest a book',
    caption: 'Browse the catalogue, pick a read, attach a note for the vote.',
  },
  {
    src: '/videos/demo-reading-progress.mov',
    title: 'Track reading progress',
    caption: 'Log pages, leave notes, see where the whole club is in the book.',
  },
  {
    src: '/videos/demo-rate-book.mov',
    title: 'Rate &amp; review',
    caption: 'Rate club books, leave reviews, watch the group average shift.',
  },
];

const FeatureVideoCard = ({ src, title, caption }: { src: string; title: string; caption: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => { /* autoplay may still be blocked — fine, user can tap */ });
        } else {
          el.pause();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
      {/* Faux browser chrome — traffic-light dots + URL bar — promotes a
          raw screen recording from "video file" to "real product". */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-stone-100 dark:bg-gray-900/60 border-b border-black/5 dark:border-white/5">
        <span className="w-2 h-2 rounded-full bg-red-400/80" />
        <span className="w-2 h-2 rounded-full bg-amber-400/80" />
        <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
        <span className="ml-3 text-[10px] text-stone-500 dark:text-stone-400 font-mono truncate">mybookclub.win</span>
      </div>

      <div className="bg-stone-50 dark:bg-gray-900">
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="w-full h-auto block"
        />
      </div>

      <figcaption className="px-5 py-4">
        <p className="text-base font-semibold text-stone-900 dark:text-stone-100">{title}</p>
        <p
          className="text-sm text-stone-500 dark:text-stone-400 mt-1 leading-relaxed"
          // Caption has &amp; encoded — render as text not HTML.
          dangerouslySetInnerHTML={{ __html: caption }}
        />
      </figcaption>
    </figure>
  );
};

const FeatureVideosShowcase = () => (
  <section className="px-6 md:px-16 py-16 md:py-24 bg-[#F0EFEB] dark:bg-gray-800">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12 md:mb-14">
        <p className="text-stone-500 dark:text-stone-400 text-xs uppercase tracking-[0.25em] mb-3 font-outfit">
          Watch it in motion
        </p>
        <h2 className="font-display text-3xl md:text-5xl font-bold text-stone-900 dark:text-warmgray-100 leading-tight">
          Real flows. Real fast.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {VIDEOS.map((v) => <FeatureVideoCard key={v.src} {...v} />)}
      </div>
    </div>
  </section>
);

export default FeatureVideosShowcase;
