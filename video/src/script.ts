const FPS = 30;
const BPM = 120;
const FRAMES_PER_BEAT = (FPS * 60) / BPM;
const atBar = (bar: number) => bar * 4 * FRAMES_PER_BEAT;

// This is intentionally a fictional cue, not an audio asset. It gives the
// picture a reliable musical grid now and lets a future track be edited or
// replaced without rebuilding the visual pacing. The edit is 66 seconds;
// individual scene boundaries follow the approved editorial timing below.
export const musicCue = {
  bpm: BPM,
  beatsPerBar: 4,
  bars: 33,
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
  // These are the approved 66-second rewrite timings, in frames at 30 fps.
  // Holds are built into each scene rather than stretched by the editor.
  intro: { from: 0, duration: 60 },
  competition: { from: 60, duration: 210 },
  landscape: { from: 270, duration: 180 },
  friction: { from: 450, duration: 180 },
  product: { from: 630, duration: 990 },
  outcome: { from: 1620, duration: 180 },
  close: { from: 1800, duration: 180 },
} as const;

// On-screen language belongs inside each visual rather than in a persistent
// subtitle layer. This keeps the silent cut understandable without turning it
// into a narrated slide deck.
