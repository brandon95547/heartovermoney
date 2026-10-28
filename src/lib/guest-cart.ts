// The cart of a visitor who isn't signed in: kept in a cookie as piece ids and quantities only
// (prices, stock and the VIP rules are read fresh). Signing in, creating an account or checking
// out as a guest moves it into the account's cart.
import "server-only";
import { inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema as s } from "@/db";

const COOKIE = "hom_cart";
const MAX_LINES = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GuestLine = { artworkId: string; quantity: number };

export async function readGuestCart(): Promise<GuestLine[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l): l is GuestLine => typeof l?.artworkId === "string" && UUID.test(l.artworkId) && Number.isInteger(l.quantity) && l.quantity > 0)
      .map((l) => ({ artworkId: l.artworkId, quantity: Math.min(10, l.quantity) }))
      .slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

// Only from Server Actions and Route Handlers: cookies can't be written while rendering.
export async function writeGuestCart(lines: GuestLine[]) {
  const jar = await cookies();
  const kept = lines.filter((l) => l.quantity > 0).slice(0, MAX_LINES);
  if (!kept.length) jar.delete(COOKIE);
  else jar.set(COOKIE, JSON.stringify(kept), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 86_400 });
}

export async function moveGuestCartTo(userId: string) {
  const lines = await readGuestCart();
  if (!lines.length) return;
  const exist = new Set((await db.select({ id: s.artworks.id }).from(s.artworks)
    .where(inArray(s.artworks.id, lines.map((l) => l.artworkId)))).map((r) => r.id));
  for (const l of lines.filter((l) => exist.has(l.artworkId))) {
    await db.insert(s.cartItems).values({ userId, artworkId: l.artworkId, quantity: l.quantity })
      .onConflictDoUpdate({ target: [s.cartItems.userId, s.cartItems.artworkId], set: { quantity: sql`least(${s.cartItems.quantity} + ${l.quantity}, 10)` } });
  }
  await writeGuestCart([]);
}
