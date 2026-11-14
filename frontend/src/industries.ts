import type { Suggestion } from "./components/Autocomplete";
import jobTitles from "./data/job_titles.json";

const ACRONYMS: Record<string, string> = { saas: "SaaS" };

/** "saas_company" -> "SaaS company", "investment_banking" -> "Investment banking" */
function labelFromKey(key: string): string {
  const [first = "", ...rest] = key.split("_");
  const head =
    ACRONYMS[first] ?? first.charAt(0).toUpperCase() + first.slice(1);
  return [head, ...rest].join(" ");
}

export const INDUSTRIES: string[] = Object.keys(jobTitles).map(labelFromKey);

const normalize = (s: string) => s.toLowerCase().trim();

/** Industries where any word starts with the query (so "company" finds "SaaS company"). */
export function searchIndustries(query: string, limit = 8): Suggestion[] {
  const q = normalize(query);
  if (q.length < 1) return [];
  return INDUSTRIES.filter((label) =>
    normalize(label)
      .split(" ")
      .some((word) => word.startsWith(q)),
  )
    .slice(0, limit)
    .map((label) => ({ value: label, label }));
}
