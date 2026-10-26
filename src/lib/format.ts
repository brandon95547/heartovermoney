// Display helpers shared by server and client components.

export function money(cents: number, opts: { cents?: boolean } = {}): string {
  const showCents = opts.cents ?? cents % 100 !== 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
}

export function eventDate(d: Date): string {
  return d.toLocaleString("en-US", {
    hour: "numeric", minute: "2-digit", day: "numeric", month: "long", year: "numeric",
    timeZone: "America/New_York",
  });
}

export function shortTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

// "Today 5:00 PM", "Tomorrow 5:00 PM", "Thu 5:00 PM", or "Nov 12, 5:00 PM" past a week, by the
// calendar day in Eastern time.
export function dayAndTime(d: Date, now: Date = new Date()): string {
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const days = Math.round((Date.parse(day(d)) - Date.parse(day(now))) / 86_400_000);
  const label = days === 0 ? "Today" : days === 1 ? "Tomorrow"
    : d.toLocaleDateString("en-US", days > 1 && days < 7 ? { weekday: "short", timeZone: "America/New_York" }
      : { month: "short", day: "numeric", timeZone: "America/New_York" }) + (days > 1 && days < 7 ? "" : ",");
  return `${label} ${shortTime(d)}`;
}

// "25m", "3h 10m", "2d 4h": how long until a moment, for auction countdowns.
export function timeLeft(until: Date, now: Date = new Date()): string {
  let s = Math.max(0, Math.floor((until.getTime() - now.getTime()) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

export const kindLabel: Record<string, string> = {
  merch: "Limited Edition Merch",
  shoes: "Limited Edition Shoes",
  print: "Limited Edition Print",
  founders_art: "Founders Edition Art",
};
