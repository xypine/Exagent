# Exagent demo video

An editable 66-second, 1920×1080 Remotion composition. It is deliberately built
from code, rather than a screen-recording timeline, so copy, pacing, fictional
demo records, and visuals can be revised quickly. Its product sequence recreates
the real Exagent interface with deterministic illustrative data.

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
- `src/Video.tsx` — composition, outcome, and end-card visuals.
- `src/sections/` — independently editable opening, landscape, friction, and
  app-flow scenes.
- `src/Root.tsx` — output format and composition duration.

## Voiceover

The silent cut tells its story with concise copy integrated into the visual
scenes; it has no persistent subtitle layer. If voiceover is added, write it
to support the picture rather than duplicating every on-screen statement, then
add it as a separate Remotion asset so picture edits do not require
re-recording a browser demo.

## Recording the real frontend

Use the deterministic frontend mocks for repeatable footage rather than live
provider output. In one terminal, start the frontend:

```bash
VITE_USE_MOCKS=true pnpm --dir frontend dev --host 127.0.0.1 --port 4173
```

Then, from the repository root and inside the development shell, record either
the actual app flow or the frontend's How it works pipeline:

```bash
nix develop --command node video/scripts/record-browser-demo.mjs app
nix develop --command node video/scripts/record-browser-demo.mjs pipeline
```

The captures are written under `video/out/recordings/` and ignored by Git. The
script drives Chromium through its DevTools protocol: the form, progress,
results, public-background modal, and About-you panel are all real frontend
states, not recreated video UI.

## Editorial note

All company and person data in this composition are intentionally illustrative.
The live CLI search was used only to validate the shape of the real product
results; it is not shown in this render.
