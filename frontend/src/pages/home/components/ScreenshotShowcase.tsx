import useScrollReveal from '@hooks/useScrollReveal';

/**
 * ScreenshotShowcase — small gallery of product screenshots shown on
 * the logged-out homepage between the hero and the feature sections.
 *
 * Animation: heading fades up first, then cards stagger in (80ms apart,
 * 400ms each). Driven by IntersectionObserver via `useScrollReveal` so
 * animations fire when the section actually enters the viewport. Short
 * durations + small stagger keep the scroll feeling instant — none of
 * the cards stay hidden long enough to look "stuck".
 */
const SHOTS = [
  {
    src: '/images/bookclub-suggestions.png',
    title: 'Book voting',
    caption: 'Suggest reads, vote on what the club picks up next.',
  },
  {
    src: '/images/bookclub-calendar.png',
    title: 'Shared calendar',
    caption: 'Meetings, reading deadlines, and milestones at a glance.',
  },
  {
    src: '/images/reading-progress-2.png',
    title: 'Ratings & reviews',
    caption: 'Rate club books, leave reviews, see what everyone thought.',
  },
  {
    src: '/images/user-profile.png',
    title: 'Personal library',
    caption: 'Your own bookshelf — finished, reading, want-to-read, favorites.',
  },
];

const ScreenshotShowcase = () => {
  // 0.15 threshold = the heading hits the trigger as the first chunk of
  // the section becomes visible, so animations start without waiting for
  // the user to scroll past it.
  const { ref, isVisible } = useScrollReveal(0.15);

  return (
    <section ref={ref} className="px-6 md:px-16 py-16 md:py-24 bg-parchment dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Eyebrow + heading — fade-up first, no stagger delay */}
        <div
          className={`text-center mb-12 md:mb-14 transition-all duration-500 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-stone-500 dark:text-stone-400 text-xs uppercase tracking-[0.25em] mb-3 font-outfit">
            See it in action
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-stone-900 dark:text-warmgray-100 leading-tight">
            Everything your reading group needs.
          </h2>
        </div>

        {/* Cards stagger in 100ms apart, after the heading lands.
            Per-card `transitionDelay` so we don't need a 4-class stagger
            scheme — just multiply index. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {SHOTS.map((shot, i) => (
            <figure
              key={shot.src}
              style={{ transitionDelay: isVisible ? `${150 + i * 100}ms` : '0ms' }}
              className={`group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-md hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <div className="overflow-hidden bg-stone-50 dark:bg-gray-900">
                <img
                  src={shot.src}
                  alt={shot.title}
                  loading="lazy"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <figcaption className="px-5 py-4">
                <p className="text-base font-semibold text-stone-900 dark:text-stone-100">
                  {shot.title}
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  {shot.caption}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ScreenshotShowcase;
