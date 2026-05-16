# Video assets for the home showcase

Drop your demo video here:

  demo.mp4         — required, ~5-15 second muted screen recording
  demo-poster.jpg  — optional, first-frame still shown before video loads

## Recommended specs

- **Codec:** H.264 (most compatible) or H.265 if you target modern browsers
- **Container:** .mp4
- **Resolution:** 1280×720 or 1920×1080 — anything wider gets scaled down anyway
- **Duration:** 5-15 seconds (autoplay loop)
- **Audio:** strip it. Browsers block autoplay with audio, and we set `muted` anyway.
- **File size:** target ~2-5 MB. Hits Time-To-First-Byte hard otherwise.

## Quick capture (macOS)

1. **Cmd+Shift+5** → "Record selected portion" → drag over the browser → record
2. Crop the clip in QuickTime: **Edit → Trim** → select 5-15s
3. Export as .mp4 via free converter, e.g.:

   ```sh
   # ffmpeg one-liner that strips audio + reasonable compression
   ffmpeg -i input.mov -c:v libx264 -crf 28 -preset slow -an -movflags +faststart demo.mp4
   ```

   - `-crf 28`  good quality, smaller file (lower = bigger + sharper)
   - `-an`      drop audio entirely
   - `+faststart` puts the metadata up front so the video plays immediately

## Quick poster (optional)

```sh
ffmpeg -i demo.mp4 -vframes 1 -q:v 2 demo-poster.jpg
```

Without a poster the video shows a black rectangle until the first frame paints — usually fine, but a poster makes the LCP feel snappier.
