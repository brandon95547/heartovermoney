// Where an auction lot stands, for its page and the Auctions list:
//   early   before the event, with a Buy Now price VIPs can take
//   preview before the event, no Buy Now: look now, bid at the live auction
//   live    the live auction is on
//   closed  sold, or the auction is over
export type LotPhase = "early" | "preview" | "live" | "closed";

export function lotPhase(
  lot: { status: string; buyNowCents: number | null; auctionStartsAt: Date; auctionEndsAt: Date },
  now: Date = new Date(),
): LotPhase {
  if (lot.status !== "open" || now > lot.auctionEndsAt) return "closed";
  if (now >= lot.auctionStartsAt) return "live";
  return lot.buyNowCents ? "early" : "preview";
}

export const PHASE_LABEL: Record<LotPhase, string> = {
  early: "VIP early Buy Now",
  preview: "Preview",
  live: "Live bidding",
  closed: "Closed",
};

// Who may bid once the live auction opens: VIPs on art lots, anyone signed in on the rest.
export const canBidOn = (lot: { isArt: boolean }, isVip: boolean) => isVip || !lot.isArt;
