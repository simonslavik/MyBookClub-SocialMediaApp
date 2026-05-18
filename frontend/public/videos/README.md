# Demo videos — homepage feature showcase

The logged-out homepage has a `FeatureVideosShowcase` section that
auto-plays short demos of the core flows. Each file below is referenced
by `src/pages/home/components/FeatureVideosShowcase.tsx` — adding or
renaming files here requires the same change there.

## Current files

| Filename                       | Feature shown                              |
| ------------------------------ | ------------------------------------------ |
| `demo-create-bookclub.mov`     | Create a new book club (cover · visibility)|
| `demo-add-suggestion.mov`      | Suggest a book + attach a note for voting  |
| `demo-reading-progress.mov`    | Log pages read, view group progress        |
| `demo-rate-book.mov`           | Rate a club book + leave a review          |

## Adding more videos

1. Drop the file here (kebab-case, prefix with `demo-`).
2. Append an entry to the `VIDEOS` array in
   `frontend/src/pages/home/components/FeatureVideosShowcase.tsx`.
3. That's it — the IntersectionObserver autoplay handles the rest.

## Recommended specs

- **Codec:** H.264 (most compatible). QuickTime screen recordings on
  macOS already use H.264 — `.mov` works in modern Chrome / Edge /
  Safari. For maximum browser compatibility convert to `.mp4`:

  ```sh
  ffmpeg -i input.mov -c:v libx264 -crf 28 -preset slow -an \
         -movflags +faststart output.mp4
  ```

  - `-crf 28`    good quality, smaller file (lower = bigger + sharper)
  - `-an`        drop audio entirely (browsers block autoplay with audio)
  - `+faststart` puts the metadata up front so the video plays immediately

- **Resolution:** 1280×720 or 1920×1080 — anything wider gets scaled down anyway
- **Duration:** 5–15 seconds (autoplay loop)
- **File size:** target 2–5 MB per video. Bigger = sluggish homepage TTFB.

## Quick capture (macOS)

1. **Cmd+Shift+5** → "Record selected portion" → drag over the browser → record
2. Crop in QuickTime: **Edit → Trim** → select 5–15s
3. Save as `.mov` here (or run the ffmpeg one-liner above to convert to `.mp4`)
