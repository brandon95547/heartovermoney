// Certificate of authenticity IDs, in the business plan's format:
//   TITLE_NUMBER/EDITION_CITY-STATE_MM.DD.YYYY-ARTIST
//   e.g. JESUS-MULTIPLIES_14/50_WILMINGTON-NC_09.14.2026-JSF
// The slash is kept in the printed ID; URLs use the encoded form. The date is the day in the
// Carolinas, where the site's event times are shown, not the server's UTC day.

const slugPart = (s: string) =>
  s.toUpperCase().normalize("NFKD").replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function certificateCode(input: {
  title: string;
  number: number;
  editionSize: number;
  city: string;
  state: string;
  issuedAt: Date;
  artistPrefix: string;
}): string {
  const date = input.issuedAt
    .toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", timeZone: "America/New_York" })
    .replaceAll("/", ".");
  return [
    slugPart(input.title),
    `${input.number}/${input.editionSize}`,
    `${slugPart(input.city)}-${slugPart(input.state)}`,
    `${date}-${slugPart(input.artistPrefix)}`,
  ].join("_");
}

export const certificatePath = (code: string) => `/certificates/${encodeURIComponent(code)}`;
