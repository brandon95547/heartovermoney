// Where to send someone after signing in or joining: only a path on this site, so a `next`
// in a link can't send them elsewhere.
export function safeNext(v: unknown, fallback = "/"): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}

// A link that comes back to `path` afterwards: "/signin?next=%2Fart%2Fx".
export const withNext = (to: string, path: string) => `${to}?next=${encodeURIComponent(path)}`;
