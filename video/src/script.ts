const FPS = 30;
const BPM = 120;
const FRAMES_PER_BEAT = (FPS * 60) / BPM;
const atBar = (bar: number) => bar * 4 * FRAMES_PER_BEAT;

// This is intentionally a fictional cue, not an audio asset. It gives the
// picture a reliable musical grid now and lets a future track be edited or
// replaced without rebuilding the visual pacing. 35 bars at 120 BPM = 70 sec.
export const musicCue = {
  bpm: BPM,
  beatsPerBar: 4,
  bars: 35,
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
  evidence: "Current role verified · public source available",
  outreach: "Ask about the engineering challenges behind their next stage of growth.",
};

export const scenes = {
  // Every entry is a downbeat. The short holds after each arrival make the
  // edit feel intentional rather than like a sequence of rushed slides.
  intro: { from: atBar(0), duration: atBar(1) },
  competition: { from: atBar(1), duration: atBar(5) },
  reframe: { from: atBar(6), duration: atBar(5) },
  workflow: { from: atBar(11), duration: atBar(8) },
  results: { from: atBar(19), duration: atBar(9) },
  contact: { from: atBar(28), duration: atBar(4) },
  close: { from: atBar(32), duration: atBar(3) },
} as const;

// On-screen language belongs inside each visual rather than in a persistent
// subtitle layer. This keeps the silent cut understandable without turning it
// into a narrated slide deck.
