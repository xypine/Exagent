import capitals from "./data/capitals.json";

export type Capital = { city: string; country: string };

const CAPITALS: Capital[] = capitals;

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

export const formatLocation = (c: Capital) => `${c.city}, ${c.country}`;

/** Capitals whose city (first) or country name starts with the query. */
export function searchCapitals(query: string, limit = 8): Capital[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const byCity: Capital[] = [];
  const byCountry: Capital[] = [];
  for (const c of CAPITALS) {
    if (normalize(c.city).startsWith(q)) byCity.push(c);
    else if (normalize(c.country).startsWith(q)) byCountry.push(c);
  }
  return [...byCity, ...byCountry].slice(0, limit);
}
