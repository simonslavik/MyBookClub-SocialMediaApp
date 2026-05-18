/**
 * Dark hero banner for the Discover page.
 */
const DiscoverHero = () => (
  <section className="relative overflow-hidden bg-stone-800 dark:bg-gray-950">
    {/* Decorative grain overlay */}
    <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiPjwvcmVjdD4KPC9zdmc+')] pointer-events-none" />

    {/* Mobile is heavily compressed: eyebrow + long subtitle hidden, heading
        ~half-size, padding tight — so the search bar lands above the fold
        instead of forcing the user to scroll past wasted chrome. */}
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-24 relative z-10">
      <p className="hidden sm:block text-stone-400 text-xs uppercase tracking-[0.25em] mb-4 font-outfit">
        Explore &middot; Join &middot; Read Together
      </p>
      <h1 className="text-2xl md:text-6xl lg:text-7xl font-display font-bold text-white leading-tight md:leading-[1.08] tracking-tight max-w-3xl">
        Discover Book&nbsp;Clubs
      </h1>
      <p className="hidden sm:block mt-4 text-lg md:text-xl text-stone-300 font-outfit max-w-xl leading-relaxed">
        Find your perfect reading community — browse hundreds of clubs, see what
        they&rsquo;re reading, and join in&nbsp;seconds.
      </p>
    </div>
  </section>
);

export default DiscoverHero;
