import { useEffect, useRef } from 'react';
import useScrollReveal from '@hooks/useScrollReveal';

type MediaProp =
  | { type: 'video'; src: string; alt?: string }
  | { type: 'image'; src: string; alt?: string }
  | null;

interface FeatureSectionProps {
  /** Big drop-cap letter at the start of the paragraph. */
  initial: string;
  /** Remaining body text after the drop cap. */
  text: string;
  /** Swap media/text column order. */
  reverse?: boolean;
  /** Optional Tailwind background classes for the section. */
  bgClass?: string;
  /** Small decorative image overlaid on the text column (legacy prop). */
  image?: string | null;
  /** Main media for the left/right column — either an image or a video. */
  media?: MediaProp;
}

/**
 * Reusable feature section with a media slot + drop-cap paragraph.
 * Supports alternating layout via `reverse`. The media slot accepts
 * either an image OR a video (IntersectionObserver autoplay, muted,
 * loop) — when no media is provided, falls back to a soft neutral
 * placeholder so the layout still balances.
 */
const FeatureSection = ({
  initial,
  text,
  reverse = false,
  bgClass = 'bg-parchment-dark dark:bg-gray-800',
  image = null,
  media = null,
}: FeatureSectionProps) => {
  const { ref, isVisible } = useScrollReveal(0.2);

  return (
    <section ref={ref} className={`${bgClass} transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto px-6 md:px-16 py-16 md:py-24 flex flex-col md:flex-row items-center gap-10 md:gap-16">
        {/* Media slot */}
        <div
          className={`w-full md:w-1/2 transition-all duration-700 ease-out ${
            isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${reverse ? 'translate-x-12' : '-translate-x-12'}`
          } ${reverse ? 'order-1 md:order-2' : ''}`}
        >
          <FeatureMedia media={media} />
        </div>

        {/* Text column */}
        <div
          className={`w-full md:w-1/2 relative transition-all duration-700 delay-200 ease-out ${
            isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${reverse ? '-translate-x-12' : 'translate-x-12'}`
          } ${reverse ? 'order-2 md:order-1' : ''}`}
        >
          <p className="text-xl md:text-2xl leading-relaxed text-stone-800 dark:text-warmgray-200 font-serif">
            <span className="text-5xl md:text-6xl font-display font-bold mr-1 leading-none align-baseline text-stone-900 dark:text-warmgray-100">
              {initial}
            </span>
            {text}
          </p>
          {image && (
            <img src={image} alt="" className="absolute mt-1 right-0 top-20 h-20 md:h-24 opacity-80 dark:invert" />
          )}
        </div>
      </div>
    </section>
  );
};

/**
 * Renders the media slot — image, video, or a soft empty placeholder.
 * Wraps everything in the same "framed product preview" treatment
 * (rounded card, subtle ring, shadow) so videos and images share a
 * visual language across the page.
 */
const FeatureMedia = ({ media }: { media: MediaProp }) => {
  // No media → keep a soft neutral placeholder so the layout doesn't
  // collapse on legacy uses of FeatureSection that don't pass media.
  if (!media) {
    return (
      <div className="aspect-[4/3] bg-stone-200 dark:bg-gray-600 rounded-2xl ring-1 ring-black/5 dark:ring-white/10 shadow-md" />
    );
  }

  if (media.type === 'image') {
    return (
      <div className="rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-xl bg-white dark:bg-gray-900">
        <img
          src={media.src}
          alt={media.alt || ''}
          loading="lazy"
          className="w-full h-auto block"
        />
      </div>
    );
  }

  return <FeatureVideo src={media.src} alt={media.alt || ''} />;
};

/**
 * Auto-play-in-viewport video. Same pattern as FeatureVideosShowcase —
 * IntersectionObserver toggles play/pause so we never have multiple
 * background videos running off-screen. `preload="metadata"` keeps
 * page TTFB flat — only the moov atom loads up front.
 */
const FeatureVideo = ({ src, alt }: { src: string; alt: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => { /* autoplay may be blocked — that's fine */ });
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
    <div className="rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-xl bg-stone-100 dark:bg-gray-800">
      {/* Faux browser chrome — promotes a raw screen recording from
          "video file" to "real product preview". Hidden on tiny screens
          to keep the visible video area tall. */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-stone-100 dark:bg-gray-900/60 border-b border-black/5 dark:border-white/5">
        <span className="w-2 h-2 rounded-full bg-red-400/80" />
        <span className="w-2 h-2 rounded-full bg-amber-400/80" />
        <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
        <span className="ml-3 text-[10px] text-stone-500 dark:text-stone-400 font-mono truncate">mybookclub.win</span>
      </div>
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
        className="w-full h-auto block"
      />
    </div>
  );
};

export default FeatureSection;
