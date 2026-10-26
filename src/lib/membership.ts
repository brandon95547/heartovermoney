// Monthly membership tiers, from the business plan ("Initial Revenue Strategy"), with the
// client's answers of October 2026: any membership makes someone a VIP, from $25 a month. The
// 700 Club is $77 a month ($924 a year) with 700 seats; the tiers above it include it. A 700
// Club member who has bought more than one fine art piece is a Super Optimistic VIP.
export const TIERS = [
  { id: "supporter", name: "Supporter", cents: 2500, club: false },
  { id: "mission_partner", name: "Mission Partner", cents: 5000, club: false },
  { id: "seven_hundred_club", name: "700 Club", cents: 7700, club: true },
  { id: "city_builder", name: "City Builder", cents: 10000, club: true },
  { id: "mission_sponsor", name: "Mission Sponsor", cents: 25000, club: true },
] as const;

export type TierId = (typeof TIERS)[number]["id"];

export const CLUB_SEATS = 700;

export const tierById = (id: string | null | undefined) => TIERS.find((t) => t.id === id) ?? null;

// A VIP is any member, or an account the team made VIP (or an admin).
export const isVipMember = (role: string, tier: string | null) => role === "vip" || role === "admin" || !!tier;

// Art is for VIPs: fine art, and every auction lot. Merch and shoes are open to everyone.
export const FINE_ART_KINDS: readonly string[] = ["print", "founders_art"];
export const needsVip = (kind: string) => FINE_ART_KINDS.includes(kind);

export const isSuperOptimistic = (tier: string | null, fineArtPieces: number) => !!tierById(tier)?.club && fineArtPieces > 1;
