# Exagent demo video — working plan

## Goal

Create a programmatic, editable demo video for a Junction hackathon audience:
other attendees and the challenge partner. It must be at most two minutes;
the current target is a 65–75 second landscape cut.

The video should communicate, without relying on narration, that applying to an
existing job post makes it hard to stand out; a better path can be finding a
company where a candidate could contribute and starting a thoughtful
conversation with the right person. Exagent automates the research required to
find that company and person.

Voiceover is optional polish (likely ElevenLabs), never a dependency. Captions
must not carry the story alone and there must be no text walls.

For the current silent edit, picture follows a fictional 120 BPM, 4/4 music
cue: scene entries land on downbeats, while the visual moves land on following
beats and then hold. No temporary audio asset is required yet.

## Product and data constraints

- Use the **actual Exagent brand** as canonical: current frontend logo, light
  navy/indigo palette, Inter, Instrument Serif accent type, rounded white cards,
  and the front-page visual system.
- The UI journey must feel like a user using Exagent, but it may use carefully
  selected deterministic demo data rather than live providers.
- The first render is illustrative, not live product output. Keep the small
  `Illustrative demo data` disclosure.
- Use fictional/placeholder data: `Dream Company` and featured CTO `Matti
  Meikäläinen` (the Finnish equivalent of John Doe). Other visible people use
  international generic names such as Jane Smith, Alex Johnson, and Taylor
  Brown.
- Do not make the story sound like applicants lack skill, are bitter, or merely
  need more motivation. The obstacle is an inefficient, noisy application
  process.
- Do not promise a reply or a job. The value is a better-informed starting
  conversation.

## Story structure to retain

Keep this high-level sequence from the first pitch; improve style, graphics,
and text economy rather than rewriting it:

1. **Competition / blending in**
2. **Alternative: a company of interest**
3. **Manual research friction**
4. **Exagent search workflow**
5. **Companies and people results**
6. **One compelling person to contact**
7. **Closing statement**

## Opening visual: application sea

The opening metaphor is a calm, abstract sea: a gently wavy matrix of
application dots. Our applicant begins distinct just long enough to establish
their point of view, then blends into the same visual treatment as every other
dot.

This represents difficulty differentiating from a large existing applicant
pool. It must not be stressful, hostile, or a depiction of rejection:

- No growing pile of CVs, trash/discard imagery, panic, red alarms, or
  overwhelming density.
- No claim that the applicant is weak, unlucky, or unqualified.
- The dot field should feel calm and neutral; the meaning comes from visual
  indistinguishability.

The field can then resolve into an opportunity landscape and a path toward
`Dream Company`.

## Visual approach

This must be motion graphics, not a sequence of static slides with fades.
Motion should explain concepts:

- application dots drift in a wavy grid and equalise;
- a route forms from the applicant toward companies;
- manual company/person/source research splinters into a tangled network;
- Exagent's branded form organizes that network into a clear pipeline;
- companies, people, evidence, and ranking cards physically assemble, sort,
  connect, and collapse into the final recommendation.

Use sparse, integrated on-screen copy. Remove the persistent black caption
box used in the first animatic. Useful short statements include:

- `The right opportunity may not be posted yet.`
- `Find a company where you could contribute.`
- `Find the right conversation.`

The existing frontend `How it works` network/pipeline visualization is a useful
product-native reference for the conceptual graphics.

## Current implementation status

The first silent 105-second Remotion animatic is rendered at:

`video/out/exagent-demo.mp4` (ignored output)

It validates the programmatic rendering pipeline but is **not** the desired
creative direction. A second, light-brand motion-graphics pass is now in the
working tree above that first draft and is being rendered for review. It:

- imports the frontend's actual logo and uses its light navy/indigo tokens;
- replaces the application queue with an abstract drifting application sea;
- turns scattered manual research sources into a branded search pipeline;
- assembles company and people results, then expands one evidence-backed
  contact recommendation;
- removes the persistent caption box in favour of scene-integrated copy.

The first draft's remaining problems were:

- dark/neon palette instead of the actual Exagent brand;
- motion is too subtle to read as motion graphics;
- black caption box does too much explanatory work;
- conceptual visualizations are not explicit enough.

Source files:

- `video/src/script.ts` — fictional data and scene timing
- `video/src/Video.tsx` — current visual implementation
- `video/src/Root.tsx` — composition dimensions and duration
- `video/README.md` — run and render instructions

## Technical plan

The video is a Remotion composition, intentionally code-editable. Keep that
architecture, but replace the scene visuals rather than preserving the first
draft's style.

Rendering on this NixOS project requires the project development shell:

```bash
nix develop --command pnpm --dir video render
```

The project routes Remotion through wrappers in `video/bin/` so it uses the
Nix-provided FFmpeg rather than Remotion's generic binary. `video/out/` is
ignored.

## Follow-up pass

1. Review the rendered silent cut for timing, line length, and whether the
   visual transformations read at a glance. The current pacing pattern is
   transition, hold, transition: quick, graceful moves followed by a readable
   beat before the next idea.
2. Tighten or replace any copy that asks the viewer to read too much.
3. Only after the muted edit works, optionally add ElevenLabs voiceover and a
   restrained music/sound layer.
