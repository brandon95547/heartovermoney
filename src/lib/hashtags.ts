// Hashtags on posted photos. Typed as "#healing #love art" (with or without the #, separated by
// spaces or commas); kept as lowercase words without the #, up to eight.
export const MAX_HASHTAGS = 8;

export function parseHashtags(input: unknown): string[] {
  const words = String(input ?? "").split(/[\s,]+/).map((w) => w.replace(/^#+/, "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30));
  return [...new Set(words.filter(Boolean))].slice(0, MAX_HASHTAGS);
}

// Every photo also carries its event's own tag, e.g. #charlotte2026.
export const eventHashtag = (cityName: string, startsAt: Date) => `${cityName.toLowerCase().replace(/[^a-z0-9]/g, "")}${startsAt.getFullYear()}`;
