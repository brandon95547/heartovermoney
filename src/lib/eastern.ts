// Dates in the admin forms are typed in Eastern time, the time zone the site shows, whatever
// the server's own zone. `<input type="datetime-local">` has no zone, so these convert.
const TZ = "America/New_York";

function parts(d: Date) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
}

// A Date as "2026-10-30T19:00" in Eastern time, for an input's value.
export function toEasternInput(d: Date | null | undefined): string {
  if (!d) return "";
  const p = parts(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// "2026-10-30T19:00" typed in Eastern time, as a Date; null when empty or not a date.
export function fromEasternInput(v: FormDataEntryValue | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(typeof v === "string" ? v : "");
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // How far Eastern time is from UTC at a moment (daylight saving included), measured twice so
  // a time just after a clock change uses the offset on its own side of it.
  const offset = (t: number) => {
    const p = parts(new Date(t));
    return t - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  };
  return new Date(guess + offset(guess + offset(guess)));
}
