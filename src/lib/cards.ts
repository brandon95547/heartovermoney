// The collector cards in an event's deck, as the card process shows them. The faces are
// stand-ins until the printed designs arrive.
export const CARD_DESIGNS = {
  joker: { name: "Joker", corner: "JOKER", face: "🎩" },
  queen: { name: "Queen", corner: "Q ♦", face: "♛" },
  rabbit: { name: "Rabbit", corner: "W", face: "🐇" },
} as const;

export type CardDesign = keyof typeof CARD_DESIGNS;
