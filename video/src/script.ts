const FPS = 30;
const BPM = 120;
const FRAMES_PER_BEAT = (FPS * 60) / BPM;
const atBar = (bar: number) => bar * 4 * FRAMES_PER_BEAT;

// This is intentionally a fictional cue, not an audio asset. It gives the
// picture a reliable musical grid now and lets a future track be edited or
// replaced without rebuilding the visual pacing. 25 bars at 120 BPM = 50 sec.
export const musicCue = {
  bpm: BPM,
  beatsPerBar: 4,
  bars: 25,
  character: "confident, precise electronic pulse with a warm lift",
} as const;

export const demo = {
  applicant: "A recent software graduate",
  company: "Dream Company",
  city: "Helsinki, Finland",
  industry: "SaaS",
  person: "Matti Meikäläinen",
  title: "CTO",
  score: 92,
  profile: "Recent software graduate with hands-on TypeScript and React experience. Looking for a product-minded role in developer tools or an early-stage team.",
  evidence: "Current role verified · public source available",
  outreach: "Ask about the engineering challenges behind their next stage of growth.",
};

export const scenes = {
  // Every entry is a downbeat. The short holds after each arrival make the
  // edit feel intentional rather than like a sequence of rushed slides.
  intro: { from: atBar(0), duration: atBar(1) },
  competition: { from: atBar(1), duration: atBar(2) },
  reframe: { from: atBar(3), duration: atBar(2) },
  pipeline: { from: atBar(5), duration: atBar(3) },
  workflow: { from: atBar(8), duration: atBar(2) },
  results: { from: atBar(10), duration: atBar(9) },
  contact: { from: atBar(19), duration: atBar(4) },
  close: { from: atBar(23), duration: atBar(2) },
} as const;

// On-screen language belongs inside each visual rather than in a persistent
// subtitle layer. This keeps the silent cut understandable without turning it
// into a narrated slide deck.
