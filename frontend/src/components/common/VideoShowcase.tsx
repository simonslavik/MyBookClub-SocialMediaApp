import { useEffect, useRef, useState } from 'react';

interface VideoShowcaseProps {
  /** Video source under /public — defaults to /videos/demo.mp4. */
  src?: string;
  /** Optional first-frame still shown before the video loads or if it 404s. */
  poster?: string;
  /** Caption rendered above the frame. */
  eyebrow?: string;
  /** Big headline above the video. */
  title?: string;
  /** Short paragraph beneath the headline. */
  subtitle?: string;
}

/**
 * "Linear / Notion / Vercel"-style video hero — an autoplaying muted loop
 * inside a faux-browser chrome that gives the screen recording extra polish.
 *
 * The video auto-pauses when scrolled out of view to save battery + bandwidth
 * on mobile, and gracefully degrades to the poster image (or a skeleton) if
 * the video file is missing.
 */
const VideoShowcase = ({
  src = '/videos/demo.mp4',
  poster = '/videos/demo-poster.jpg',
  eyebrow = 'See it in action',
  title = 'A modern home for your reading group',
  subtitle = 'Real-time chat, book voting, reading progress and meeting scheduling — all in one shared space.',
}: VideoShowcaseProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(true);

  // Pause when out of view — autoplay loops chew battery on mobile and
  // distract from below-the-fold content. The video still preloads metadata
  // so it starts instantly the second the user scrolls back to it.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => { /* autoplay may be blocked — fine, poster shows */ });
        } else {
          el.pause();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="px-4 sm:px-6 md:px-16 py-12 md:py-20 bg-parchment dark:bg-gray-900">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-stone-500 dark:text-stone-400 text-xs uppercase tracking-[0.25em] mb-3 font-outfit">
          {eyebrow}
        </p>
        <h2 className="font-display text-3xl md:text-5xl font-bold text-stone-900 dark:text-warmgray-100 leading-tight mb-3">
          {title}
        </h2>
        <p className="hidden sm:block text-base md:text-lg text-stone-600 dark:text-stone-300 max-w-2xl mx-auto mb-8 font-outfit">
          {subtitle}
        </p>

        {/* Faux-browser chrome — the rounded frame + traffic-light dots
            make a raw screen recording read as "this is a real product"
            instead of "here's a video file". */}
        <div className="relative rounded-xl md:rounded-2xl overflow-hidden bg-stone-200 dark:bg-gray-800 shadow-2xl ring-1 ring-black/10 dark:ring-white/10 mt-6">
          <div className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-stone-300/60 dark:bg-gray-700/60 backdrop-blur-sm border-b border-black/5 dark:border-white/5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
            <span className="ml-3 text-[11px] text-stone-500 dark:text-stone-400 font-mono truncate">
              mybookclub.win
            </span>
          </div>

          {hasVideo ? (
            <video
              ref={videoRef}
              src={src}
              poster={poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
              onError={() => setHasVideo(false)}
              className="w-full h-auto block bg-stone-100 dark:bg-gray-900"
            />
          ) : (
            // Fallback when the video file isn't present yet — keeps the
            // hero looking polished instead of broken.
            <div className="w-full aspect-video bg-stone-100 dark:bg-gray-900 flex items-center justify-center">
              <p className="text-sm text-stone-500 dark:text-stone-400 italic">
                Demo video coming soon
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default VideoShowcase;
