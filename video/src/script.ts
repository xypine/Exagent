const FPS = 30;

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
  competition: { from: 0, duration: 16 * FPS },
  reframe: { from: 16 * FPS, duration: 12 * FPS },
  workflow: { from: 28 * FPS, duration: 23 * FPS },
  results: { from: 51 * FPS, duration: 25 * FPS },
  contact: { from: 76 * FPS, duration: 19 * FPS },
  close: { from: 95 * FPS, duration: 10 * FPS },
} as const;

// On-screen language belongs inside each visual rather than in a persistent
// subtitle layer. This keeps the silent cut understandable without turning it
// into a narrated slide deck.
