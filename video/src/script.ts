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
  search: { from: 28 * FPS, duration: 23 * FPS },
  results: { from: 51 * FPS, duration: 25 * FPS },
  contact: { from: 76 * FPS, duration: 19 * FPS },
  close: { from: 95 * FPS, duration: 10 * FPS },
} as const;

// Keep this copy aligned with the ElevenLabs script. One short phrase per line
// makes the video useful with sound off and prevents caption walls.
export const captions = [
  { from: 2.0, text: "A job post can attract hundreds of applicants." },
  { from: 7.0, text: "Even a great candidate can be easy to miss." },
  { from: 12.0, text: "So what if the right opportunity is not posted yet?" },
  { from: 18.0, text: "Find a company where you could genuinely contribute." },
  { from: 23.0, text: "Then find the person who can start the conversation." },
  { from: 30.0, text: "But that research takes hours." },
  { from: 37.0, text: "Exagent automates it." },
  { from: 46.0, text: "Start with a city and an industry." },
  { from: 55.0, text: "See companies worth exploring." },
  { from: 63.0, text: "Then the people who can influence a hiring decision." },
  { from: 78.0, text: "One company. One well-timed conversation." },
  { from: 87.0, text: "With evidence for why they matter." },
  { from: 98.0, text: "From interest in a company to the right conversation." },
] as const;
