# Exagent demo video — working plan

## Goal

Create a programmatic, editable demo video for a Junction hackathon audience:
other attendees and the challenge partner. It must be at most two minutes;
the current target is a 40–60 second landscape cut (approximately 50 seconds).

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

## Current creative decisions

These decisions are the brief for the next edit and take precedence over
earlier exploratory language in this plan:

- **Brand and UI:** preserve the light Exagent visual language. The product
  scenes should closely recreate the current application rather than invent a
  dashboard: its search form, company/key-people results, first-pass
  decision-power state, profile-match expansion, score factors, public
  background, and source evidence.
- **Opening metaphor:** keep the close-up logo opening, then turn the former
  application sea into an angled forest of undiscovered employer “gems.” The
  viewer is the searcher. Finding a promising route through an unmarked forest
  is difficult and confusing, without suggesting that the candidate is
  unqualified or rejected. Avoid literal people in this metaphor unless they
  have a clear, necessary role.
- **Pipeline:** it should be short but legible, explaining the hand-off from
  input to companies, people, public research, scoring, and a shortlist. It
  must be a coherent progression, not a fast decorative graph.
- **First pass / second pass:** the first pass starts with no profile, so only
  decision power is assessed. The second pass literally types a nuanced
  profile into an app-faithful surface; it changes visible results just as the
  latest product’s matching flow would. The reason for each change must be
  inspectable rather than asserted.
- **Final detail:** make a practical outreach angle the hero. Support it with
  the person’s public background (including work history), score explanation,
  evidence sources, and visible gaps where relevant.
- **End card:** retain a minimal final Exagent card and add a link plus QR
  code.

## Opening visual: opportunity forest

The opening metaphor is a calm, abstract forest of hidden employer gems,
seen at an angle. It represents valuable companies that are hard to discover
when there are no signposts or a coherent search route. The searcher moves
through the field; Exagent later gives the exploration a useful direction.

This should not be stressful, hostile, or a depiction of rejection:

- No applicant queue, discarded CVs, panic, red alarms, or dense visual noise.
- No claim that the searcher is weak, unlucky, or unqualified.
- The field should feel intriguing rather than threatening; the friction is
  lack of orientation, not lack of opportunity.

The forest can resolve into a route toward `Dream Company` once the product
workflow begins.

## Visual approach

This must be motion graphics, not a sequence of static slides with fades.
Motion should explain concepts:

- employer gems establish depth in the opening forest, while the searcher
  lacks a route;
- a short, sequential product pipeline makes the stages of discovery legible;
- the actual form begins the product journey;
- app-faithful company and people results establish a decision-power-only
  first pass;
- a typed profile expands the existing result cards into evidence-backed
  matches; the visible score factors and ranking respond;
- the chosen person opens into an outreach-first detail view with work history,
  public evidence, and a concrete approach.

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

1. Replace the opening and the fragile pipeline visualization with the
   opportunity-forest metaphor and a short, understandable sequence.
2. Recreate the current application’s light form, results, first-pass state,
   profile match, and insight details closely enough that the demo reads as a
   product demonstration rather than an invented dashboard.
3. Make the refined match lead into an outreach angle, supported by work
   history and transparent score/source evidence.
4. Add a minimal end card with a real destination link and QR code once that
   destination is supplied.
5. Review the rendered silent cut for timing, line length, and whether the
   visual transformations read at a glance. The pacing pattern remains
   transition, hold, transition: quick, graceful moves followed by a readable
   beat before the next idea.
