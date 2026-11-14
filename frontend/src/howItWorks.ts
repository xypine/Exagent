/**
 * Content + scoring rules for the "How it works" landing section.
 * The scoring helpers mirror the documented rule: decision power 40 %,
 * background fit 40 %, common ground 20 %. Without a user profile only
 * decision power counts. The final sum is computed here, never by the AI.
 */

export const WEIGHTS = { decision: 40, fit: 40, shared: 20 } as const;

export type FactorKey = keyof typeof WEIGHTS;
export type FactorScores = Record<FactorKey, number>;

export const FACTORS: {
  key: FactorKey;
  label: string;
  question: string;
}[] = [
  {
    key: "decision",
    label: "Decision power",
    question: "Can they hire you, or sway who gets hired?",
  },
  {
    key: "fit",
    label: "Background fit",
    question: "Does their organisation do work that suits you?",
  },
  {
    key: "shared",
    label: "Common ground",
    question: "Same school, past employer or a shared interest?",
  },
];

const FACTOR_KEYS = Object.keys(WEIGHTS) as FactorKey[];
const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** Points each factor contributes to the final 0–100 score. */
export function contributions(
  s: FactorScores,
  hasProfile: boolean,
): FactorScores {
  if (!hasProfile) return { decision: clamp(s.decision), fit: 0, shared: 0 };
  return {
    decision: (clamp(s.decision) * WEIGHTS.decision) / 100,
    fit: (clamp(s.fit) * WEIGHTS.fit) / 100,
    shared: (clamp(s.shared) * WEIGHTS.shared) / 100,
  };
}

/** Final 0–100 match score, computed by rules from the AI's sub-scores. */
export function matchScore(s: FactorScores, hasProfile: boolean): number {
  const c = contributions(s, hasProfile);
  return Math.round(FACTOR_KEYS.reduce((sum, k) => sum + c[k], 0));
}

export type Confidence = "high" | "medium" | "low";

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

/**
 * Confidence = how much was found about a person, NOT how good a match
 * they are. Thresholds here are illustrative for the landing demo.
 */
export function confidenceFor(sourcesFound: number): Confidence {
  if (sourcesFound >= 4) return "high";
  if (sourcesFound >= 2) return "medium";
  return "low";
}

export const SOURCE_TYPES = [
  "LinkedIn profile",
  "Company website",
  "Conference talk",
  "Interview",
  "Publication",
] as const;

export const STEPS: {
  n: string;
  label: string;
  title: string;
  body: string;
  tags: string[];
}[] = [
  {
    n: "01",
    label: "Your input",
    title: "Tell us what you're after",
    body: "Pick a city and an industry. Add a few lines about your background, skills and wishes if you like. It's optional, but the more you share, the sharper the match.",
    tags: ["City", "Industry", "About you · optional"],
  },
  {
    n: "02",
    label: "Layer 1 · Companies",
    title: "We find the companies",
    body: "The first search layer scans the web for companies in your industry, in your city. Only companies at this stage, nothing else.",
    tags: ["Web search", "Industry × city"],
  },
  {
    n: "03",
    label: "Layer 2 · People",
    title: "We find the people inside",
    body: "The second layer surfaces the people in those companies: name, role, industry and a way to reach them, like LinkedIn or email. The location already matches.",
    tags: ["Name", "Role", "Contact"],
  },
  {
    n: "04",
    label: "Layer 3 · Research",
    title: "We learn who they are",
    body: "The third layer researches each person in public sources: work history, education, publications, talks, interviews and company info. Not everyone has everything, and you'll see that.",
    tags: ["Public sources only", "Gaps stay visible"],
  },
  {
    n: "05",
    label: "Scoring",
    title: "We score who's worth a message",
    body: "AI compares every person with your profile, using only what was found. No new searching, no guessing. Three factors, fixed weights.",
    tags: ["Decision power 40 %", "Background fit 40 %", "Common ground 20 %"],
  },
  {
    n: "06",
    label: "Shortlist",
    title: "You get a ranked shortlist",
    body: "Best match first. For each person: a 0–100 score, a confidence level, reasoning with sources, an angle to open with, and what's still missing.",
    tags: ["Score", "Confidence", "Sources", "Opening angle"],
  },
];

export const TRUST: { title: string; body: string }[] = [
  {
    title: "Every point has a reason",
    body: "Each score breaks down into sub-scores with a written rationale.",
  },
  {
    title: "Every claim names its source",
    body: "“LinkedIn profile”, “conference talk”… The AI isn't allowed to invent facts.",
  },
  {
    title: "Gaps stay visible",
    body: "Little data means low confidence and a list of what's missing. Missing data alone never lowers the score.",
  },
  {
    title: "No profile? Honest, broader scores",
    body: "Without your details only decision power counts. We tell you, and suggest adding a profile.",
  },
  {
    title: "Code does the maths",
    body: "The AI rates the factors. The final sum is calculated by fixed rules.",
  },
];

export const LIMITS: string[] = [
  "A score is an estimate, not a promise that someone replies or hires.",
  "Public web data can be outdated or incomplete.",
  "We never message anyone for you. You decide, you write.",
  "No accounts. A random browser ID, no personal data asked.",
];

export interface DemoPerson {
  id: string;
  name: string;
  title: string;
  company: number;
  scores: FactorScores;
  sources: number;
  reasons: { claim: string; source: string }[];
  angle: string;
  missing: string[];
}

export const DEMO_COMPANIES = ["Aurora", "Northwind", "Kide", "Lumo"];

export const DEMO_PEOPLE: DemoPerson[] = [
  {
    id: "d1",
    name: "Alan Parson",
    title: "CTO",
    company: 0,
    scores: { decision: 92, fit: 85, shared: 40 },
    sources: 5,
    reasons: [
      { claim: "Owns the engineering hiring plan", source: "Company website" },
      {
        claim: "Talked about growing a TypeScript team",
        source: "Conference talk",
      },
    ],
    angle: "Open with his talk on scaling small robotics teams.",
    missing: [],
  },
  {
    id: "d2",
    name: "Matti Meikäläinen",
    title: "Product Owner",
    company: 0,
    scores: { decision: 55, fit: 80, shared: 60 },
    sources: 3,
    reasons: [
      {
        claim: "Posted about growing the platform team",
        source: "LinkedIn profile",
      },
    ],
    angle: "Mention the side project that overlaps with their product.",
    missing: ["Education"],
  },
  {
    id: "d3",
    name: "Riikka Salo",
    title: "Office Manager",
    company: 0,
    scores: { decision: 25, fit: 40, shared: 10 },
    sources: 2,
    reasons: [{ claim: "Coordinates onboarding", source: "Company website" }],
    angle: "Ask who leads engineering hiring this quarter.",
    missing: ["Work history", "Talks"],
  },
  {
    id: "d4",
    name: "Sofia Lind",
    title: "Head of Data",
    company: 1,
    scores: { decision: 70, fit: 75, shared: 85 },
    sources: 4,
    reasons: [
      { claim: "Same university as you", source: "LinkedIn profile" },
      { claim: "Spoke about ML in diagnostics", source: "Conference talk" },
    ],
    angle: "Start with your shared university and her ML talk.",
    missing: [],
  },
  {
    id: "d5",
    name: "Jari Korhonen",
    title: "VP Engineering",
    company: 1,
    scores: { decision: 88, fit: 78, shared: 20 },
    sources: 4,
    reasons: [
      { claim: "Ex-founder who mentors junior devs", source: "Interview" },
    ],
    angle: "Ask about his mentoring of junior developers.",
    missing: ["Education"],
  },
  {
    id: "d6",
    name: "Ville Nieminen",
    title: "Sales Lead",
    company: 1,
    scores: { decision: 30, fit: 35, shared: 30 },
    sources: 2,
    reasons: [{ claim: "Leads Nordic expansion", source: "LinkedIn profile" }],
    angle: "A warm intro to the engineering leads.",
    missing: ["Talks", "Publications"],
  },
  {
    id: "d7",
    name: "Emma Virtanen",
    title: "CEO",
    company: 2,
    scores: { decision: 98, fit: 70, shared: 30 },
    sources: 1,
    reasons: [
      { claim: "Hires the first ten people personally", source: "Interview" },
    ],
    angle: "Keep it short: what you'd build in your first month.",
    missing: ["Work history", "Education", "Talks"],
  },
  {
    id: "d8",
    name: "Oskari Laine",
    title: "CFO",
    company: 2,
    scores: { decision: 82, fit: 72, shared: 15 },
    sources: 3,
    reasons: [
      { claim: "Signs off on new headcount", source: "Company website" },
      { claim: "Company is hiring developers", source: "LinkedIn profile" },
    ],
    angle: "Not a developer, but he approves the hires. Lead with impact.",
    missing: ["Talks"],
  },
  {
    id: "d9",
    name: "Aino Heikkinen",
    title: "Data Engineer",
    company: 2,
    scores: { decision: 20, fit: 88, shared: 70 },
    sources: 3,
    reasons: [{ claim: "Same Python meetup as you", source: "Publication" }],
    angle: "Ask about the data stack. Peers make great referrers.",
    missing: ["Education"],
  },
  {
    id: "d10",
    name: "Niko Mäkinen",
    title: "Founder & CEO",
    company: 3,
    scores: { decision: 95, fit: 90, shared: 55 },
    sources: 5,
    reasons: [
      { claim: "Hiring a small product team", source: "LinkedIn profile" },
      { claim: "Building in your exact stack", source: "Company website" },
    ],
    angle: "Lead with your robotics side project. It's their domain.",
    missing: [],
  },
  {
    id: "d11",
    name: "Laura Koski",
    title: "Talent Partner",
    company: 3,
    scores: { decision: 80, fit: 65, shared: 25 },
    sources: 3,
    reasons: [
      { claim: "Runs all engineering recruiting", source: "LinkedIn profile" },
    ],
    angle: "Be direct: role, stack, availability.",
    missing: ["Talks"],
  },
  {
    id: "d12",
    name: "Pekka Rantanen",
    title: "Designer",
    company: 3,
    scores: { decision: 15, fit: 60, shared: 45 },
    sources: 2,
    reasons: [
      { claim: "Shares your interest in hardware", source: "Interview" },
    ],
    angle: "A friendly chat about the product, not a job ask.",
    missing: ["Work history"],
  },
];

export const SIM_PRESETS: {
  label: string;
  note: string;
  scores: FactorScores;
  found: number;
}[] = [
  {
    label: "CFO at a software company",
    note: "Not a developer, but the company hires developers and the CFO approves headcount. A strong contact.",
    scores: { decision: 82, fit: 72, shared: 15 },
    found: 3,
  },
  {
    label: "Senior dev, same university",
    note: "Lots in common and a great conversation, but little say in hiring.",
    scores: { decision: 30, fit: 90, shared: 95 },
    found: 4,
  },
  {
    label: "Founder, thin footprint",
    note: "High score, low confidence. Little was found, so the gaps are listed, not hidden.",
    scores: { decision: 96, fit: 65, shared: 10 },
    found: 1,
  },
];
