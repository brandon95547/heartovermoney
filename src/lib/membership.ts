// Monthly membership tiers, from the business plan ("Initial Revenue Strategy").
// The 700 Club starts at $77.70; Supporter and Mission Partner are not part of it.
export const TIERS = [
  { id: "supporter", name: "Supporter", cents: 2500, club: false },
  { id: "mission_partner", name: "Mission Partner", cents: 5000, club: false },
  { id: "seven_hundred_club", name: "700 Club", cents: 7770, club: true },
  { id: "city_builder", name: "City Builder", cents: 10000, club: true },
  { id: "mission_sponsor", name: "Mission Sponsor", cents: 25000, club: true },
] as const;

export type TierId = (typeof TIERS)[number]["id"];

export const tierById = (id: string | null | undefined) => TIERS.find((t) => t.id === id) ?? null;
