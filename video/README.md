# Exagent demo video

An editable 105-second, 1920×1080 Remotion composition. It is deliberately built
from code, rather than a screen-recording timeline, so copy, pacing, fictional
demo records, and visuals can be revised quickly.

## Preview and render

From the repository root, inside the project development shell:

```bash
nix develop --command pnpm --dir video studio
nix develop --command pnpm --dir video render
```

The render is written to `video/out/exagent-demo.mp4`. The scripts use
Chromium and FFmpeg from the development environment; set
`REMOTION_BROWSER_EXECUTABLE` if Chromium is installed elsewhere.

## What to edit

- `src/script.ts` — all fictional demo data and scene timing.
- `src/Video.tsx` — visuals and motion.
- `src/Root.tsx` — output format and composition duration.

## Voiceover

The silent cut tells its story with concise copy integrated into the visual
scenes; it has no persistent subtitle layer. If voiceover is added, write it
to support the picture rather than duplicating every on-screen statement, then
add it as a separate Remotion asset so picture edits do not require
re-recording a browser demo.

## Editorial note

All company and person data in this composition are intentionally illustrative.
The live CLI search was used only to validate the shape of the real product
results; it is not shown in this render.
