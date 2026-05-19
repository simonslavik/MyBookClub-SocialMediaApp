// Status dot colours.
//
// Avoid `bg-gray-*` for OFFLINE — Tailwind's gray palette is remapped
// per-theme (warm-theme bone → dark beige, original dark theme → near
// black), so the OFFLINE dot blends into either the avatar or the
// surrounding background depending on context. `bg-slate-400` is in a
// colour family we don't override, so it stays a recognisable cool
// grey on every theme.
//
// Live statuses (ONLINE / AWAY / BUSY) bumped to `-600` shade — they
// were `-500` before, which on the bone palette looked washed out
// next to the saturated avatars. -600 gives a punchier dot that reads
// at small sizes.
export const STATUS_OPTIONS = [
  { value: 'ONLINE',  label: 'Online',  color: 'bg-emerald-500' },
  { value: 'AWAY',    label: 'Away',    color: 'bg-amber-500' },
  { value: 'BUSY',    label: 'Busy',    color: 'bg-rose-500' },
  { value: 'OFFLINE', label: 'Offline', color: 'bg-slate-400' },
];

export const getStatusColor = (status) => {
  return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-slate-400';
};

// Tailwind class shorthand for the ring/border around the dot that
// separates it from whatever it's overlaid on (usually an avatar).
// `ring-white` is a constant — not in the gray override palette — so
// it stays bright on every theme. Use as: `${STATUS_DOT_RING}` in
// addition to `getStatusColor(...)`.
export const STATUS_DOT_RING = 'ring-2 ring-white dark:ring-gray-900';
