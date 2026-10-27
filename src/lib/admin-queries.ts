// Read queries for the admin panel. Server-only, and per request like the site's own.
import "server-only";
import { connection } from "next/server";
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { TIERS } from "@/lib/membership";

const count = sql<number>`count(*)::int`;

export async function dashboard() {
  await connection();
  const now = new Date();
  const [[toFulfill], [sold], [openLots], [messages], [removed], [vips], [club], next, recent, activity] = await Promise.all([
    db.select({ n: count }).from(s.orders).where(and(eq(s.orders.status, "paid"), isNull(s.orders.fulfilledAt), inArray(s.orders.kind, ["art", "lot"]))),
    db.select({ n: count }).from(s.editions).where(eq(s.editions.status, "active")),
    db.select({ n: count }).from(s.lots).where(eq(s.lots.status, "open")),
    db.select({ n: count }).from(s.contactMessages).where(isNull(s.contactMessages.handledAt)),
    db.select({ n: count }).from(s.photos).where(eq(s.photos.removedBy, "community")),
    db.select({ n: count }).from(s.users).where(sql`${s.users.membershipTier} is not null or ${s.users.role} in ('vip', 'admin')`),
    db.select({ n: count }).from(s.users).where(inArray(s.users.membershipTier, TIERS.filter((t) => t.club).map((t) => t.id))),
    db.select({
      id: s.events.id, slug: s.events.slug, title: s.events.title, startsAt: s.events.startsAt, cityName: s.cities.name,
      registered: sql<number>`(select count(*)::int from ${s.registrations} where ${s.registrations.eventId} = ${s.events.id})`,
      checkedIn: sql<number>`(select count(*)::int from ${s.registrations} where ${s.registrations.eventId} = ${s.events.id} and ${s.registrations.checkedInAt} is not null)`,
      cardsLeft: sql<number>`(select count(*)::int from ${s.cards} where ${s.cards.eventId} = ${s.events.id} and not exists (select 1 from ${s.registrations} where ${s.registrations.cardId} = ${s.cards.id}))`,
    }).from(s.events).innerJoin(s.cities, eq(s.cities.id, s.events.cityId))
      .where(gt(s.events.startsAt, new Date(now.getTime() - 86_400_000))).orderBy(asc(s.events.startsAt)).limit(1),
    listOrders({ limit: 8 }),
    listActivity(8),
  ]);
  return { toFulfill: toFulfill.n, sold: sold.n, openLots: openLots.n, messages: messages.n, removed: removed.n, vips: vips.n, club: club.n, next: next[0] ?? null, recent, activity };
}

export async function listActivity(limit = 200) {
  await connection();
  return db.select({ id: s.auditLog.id, action: s.auditLog.action, target: s.auditLog.target, detail: s.auditLog.detail, at: s.auditLog.at, actor: s.users.username })
    .from(s.auditLog).leftJoin(s.users, eq(s.users.id, s.auditLog.actorId)).orderBy(desc(s.auditLog.at)).limit(limit);
}

export async function listMessages() {
  await connection();
  return db.select().from(s.contactMessages).orderBy(sql`${s.contactMessages.handledAt} is not null`, desc(s.contactMessages.createdAt)).limit(200);
}

export type OrderFilter = { status?: "open" | "fulfilled" | "refunded"; kind?: string; limit?: number };

// Orders, newest first. "open": paid art and auction lots not yet handed over or shipped.
export async function listOrders(filter: OrderFilter = {}) {
  await connection();
  const where = [];
  if (filter.status === "open") where.push(eq(s.orders.status, "paid"), isNull(s.orders.fulfilledAt));
  if (filter.status === "fulfilled") where.push(isNotNull(s.orders.fulfilledAt));
  if (filter.status === "refunded") where.push(eq(s.orders.status, "refunded"));
  if (filter.kind) where.push(sql`${s.orders.kind} = ${filter.kind}`);
  return db.select({
    id: s.orders.id, kind: s.orders.kind, status: s.orders.status, totalCents: s.orders.totalCents, createdAt: s.orders.createdAt,
    fulfillment: s.orders.fulfillment, fulfilledAt: s.orders.fulfilledAt, refundedAt: s.orders.refundedAt,
    username: s.users.username, displayName: s.users.displayName, eventTitle: s.events.title,
    items: sql<string>`(select string_agg(case when ${s.orderItems.quantity} > 1 then '(' || ${s.orderItems.quantity} || ') ' else '' end || ${s.orderItems.label}, ', ') from ${s.orderItems} where ${s.orderItems.orderId} = ${s.orders.id})`,
  }).from(s.orders).innerJoin(s.users, eq(s.users.id, s.orders.userId)).leftJoin(s.events, eq(s.events.id, s.orders.eventId))
    .where(where.length ? and(...where) : undefined).orderBy(desc(s.orders.createdAt)).limit(filter.limit ?? 200);
}

const issued = sql<number>`(select count(*)::int from ${s.editions} where ${s.editions.artworkId} = ${s.artworks.id})`;

export async function listAdminArtworks() {
  await connection();
  return db.select({
    id: s.artworks.id, slug: s.artworks.slug, title: s.artworks.title, kind: s.artworks.kind, priceCents: s.artworks.priceCents,
    editionSize: s.artworks.editionSize, images: s.artworks.images, releasesAt: s.artworks.releasesAt, issued,
    artistName: s.artists.name, cityName: s.cities.name,
  }).from(s.artworks).innerJoin(s.artists, eq(s.artists.id, s.artworks.artistId)).innerJoin(s.cities, eq(s.cities.id, s.artworks.cityId))
    .orderBy(asc(s.cities.name), asc(s.artworks.title));
}

export async function getAdminArtwork(id: string) {
  await connection();
  const [row] = await db.select({ artwork: s.artworks, issued }).from(s.artworks).where(eq(s.artworks.id, id)).limit(1);
  return row ?? null;
}

export async function listAllArtists() {
  await connection();
  return db.select({
    id: s.artists.id, slug: s.artists.slug, name: s.artists.name, bio: s.artists.bio,
    pieces: sql<number>`(select count(*)::int from ${s.artworks} where ${s.artworks.artistId} = ${s.artists.id})`,
  }).from(s.artists).orderBy(asc(s.artists.name));
}

export async function getAdminArtist(id: string) {
  await connection();
  const [row] = await db.select().from(s.artists).where(eq(s.artists.id, id)).limit(1);
  return row ?? null;
}

export async function listAllCities() {
  await connection();
  return db.select({
    id: s.cities.id, slug: s.cities.slug, name: s.cities.name, state: s.cities.state, visitedOn: s.cities.visitedOn, heroImage: s.cities.heroImage,
    pieces: sql<number>`(select count(*)::int from ${s.artworks} where ${s.artworks.cityId} = ${s.cities.id})`,
  }).from(s.cities).orderBy(asc(s.cities.visitedOn), asc(s.cities.name));
}

export async function getAdminCity(id: string) {
  await connection();
  const [row] = await db.select().from(s.cities).where(eq(s.cities.id, id)).limit(1);
  return row ?? null;
}

// Numbered pieces, newest first: one piece's, or those matching a certificate code or owner.
export async function listAdminEditions(filter: { pieceId?: string; q?: string } = {}) {
  await connection();
  const where = [];
  if (filter.pieceId) where.push(eq(s.editions.artworkId, filter.pieceId));
  if (filter.q) {
    const like = `%${filter.q.replace(/[%_]/g, "")}%`;
    where.push(sql`(${s.editions.certificateCode} ilike ${like} or ${s.users.username} ilike ${like})`);
  }
  return db.select({
    id: s.editions.id, number: s.editions.number, code: s.editions.certificateCode, status: s.editions.status,
    issuedAt: s.editions.issuedAt, title: s.artworks.title, editionSize: s.artworks.editionSize, images: s.artworks.images,
    owner: s.users.username,
  }).from(s.editions).innerJoin(s.artworks, eq(s.artworks.id, s.editions.artworkId)).leftJoin(s.users, eq(s.users.id, s.editions.ownerId))
    .where(where.length ? and(...where) : undefined).orderBy(desc(s.editions.issuedAt), desc(s.editions.number)).limit(300);
}

export async function getAdminEdition(id: string) {
  await connection();
  const [edition] = await db.select({
    id: s.editions.id, number: s.editions.number, code: s.editions.certificateCode, status: s.editions.status, statusNote: s.editions.statusNote,
    issuedAt: s.editions.issuedAt, orderId: s.editions.orderId, artworkId: s.artworks.id, title: s.artworks.title, editionSize: s.artworks.editionSize,
    images: s.artworks.images, owner: s.users.username, ownerName: s.users.displayName,
  }).from(s.editions).innerJoin(s.artworks, eq(s.artworks.id, s.editions.artworkId)).leftJoin(s.users, eq(s.users.id, s.editions.ownerId))
    .where(eq(s.editions.id, id)).limit(1);
  if (!edition) return null;
  const history = await db.select({
    id: s.provenance.id, kind: s.provenance.kind, at: s.provenance.at,
    to: sql<string | null>`(select ${s.users.username} from ${s.users} where ${s.users.id} = ${s.provenance.toUserId})`,
    from: sql<string | null>`(select ${s.users.username} from ${s.users} where ${s.users.id} = ${s.provenance.fromUserId})`,
  }).from(s.provenance).where(eq(s.provenance.editionId, id)).orderBy(asc(s.provenance.at));
  return { ...edition, history };
}

export async function listEventsBrief() {
  await connection();
  return db.select({ id: s.events.id, title: s.events.title, startsAt: s.events.startsAt, cityName: s.cities.name })
    .from(s.events).innerJoin(s.cities, eq(s.cities.id, s.events.cityId)).orderBy(desc(s.events.startsAt));
}

export async function listAdminEvents() {
  await connection();
  return db.select({
    id: s.events.id, slug: s.events.slug, title: s.events.title, startsAt: s.events.startsAt, venue: s.events.venue, cityName: s.cities.name,
    registered: sql<number>`(select count(*)::int from ${s.registrations} where ${s.registrations.eventId} = ${s.events.id})`,
    cards: sql<number>`(select count(*)::int from ${s.cards} where ${s.cards.eventId} = ${s.events.id})`,
    revenue: sql<number>`(select coalesce(sum(${s.orders.totalCents}), 0)::int from ${s.orders} where ${s.orders.eventId} = ${s.events.id} and ${s.orders.status} = 'paid')`,
  }).from(s.events).innerJoin(s.cities, eq(s.cities.id, s.events.cityId)).orderBy(desc(s.events.startsAt));
}

export async function getAdminEvent(id: string) {
  await connection();
  const [event] = await db.select().from(s.events).where(eq(s.events.id, id)).limit(1);
  if (!event) return null;
  const menu = await db.select().from(s.menuItems).where(eq(s.menuItems.eventId, id)).orderBy(asc(s.menuItems.category), asc(s.menuItems.name));
  return { event, menu };
}

// An event's deck: every card, who registered it, and where it stands.
export async function listAdminCards(eventId: string) {
  await connection();
  return db.select({
    id: s.cards.id, code: s.cards.code, design: s.cards.design,
    registrationId: s.registrations.id, fulfillment: s.registrations.fulfillment, shipAddress: s.registrations.shipAddress,
    checkedInAt: s.registrations.checkedInAt, shippedAt: s.registrations.shippedAt, jokerChoice: s.registrations.jokerChoice,
    username: s.users.username,
  }).from(s.cards).leftJoin(s.registrations, eq(s.registrations.cardId, s.cards.id)).leftJoin(s.users, eq(s.users.id, s.registrations.userId))
    .where(eq(s.cards.eventId, eventId)).orderBy(asc(s.cards.code));
}

export async function getAdminOrder(id: string) {
  await connection();
  const [order] = await db.select({
    order: s.orders, username: s.users.username, displayName: s.users.displayName, email: s.users.email,
    eventTitle: s.events.title, eventSlug: s.events.slug,
  }).from(s.orders).innerJoin(s.users, eq(s.users.id, s.orders.userId)).leftJoin(s.events, eq(s.events.id, s.orders.eventId))
    .where(eq(s.orders.id, id)).limit(1);
  if (!order) return null;
  const [items, editions] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, id)),
    db.select({ id: s.editions.id, code: s.editions.certificateCode, number: s.editions.number, status: s.editions.status, title: s.artworks.title, size: s.artworks.editionSize })
      .from(s.editions).innerJoin(s.artworks, eq(s.artworks.id, s.editions.artworkId)).where(eq(s.editions.orderId, id)).orderBy(asc(s.editions.number)),
  ]);
  return { ...order, items, editions };
}

export type MemberFilter = "all" | "vip" | "club" | "admin";

export async function listMembers(filter: MemberFilter = "all", q = "") {
  await connection();
  const where = [];
  if (filter === "vip") where.push(sql`(${s.users.membershipTier} is not null or ${s.users.role} in ('vip', 'admin'))`);
  if (filter === "club") where.push(inArray(s.users.membershipTier, TIERS.filter((t) => t.club).map((t) => t.id)));
  if (filter === "admin") where.push(eq(s.users.role, "admin"));
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    where.push(sql`(${s.users.username} ilike ${like} or ${s.users.displayName} ilike ${like} or ${s.users.email} ilike ${like})`);
  }
  return db.select({
    id: s.users.id, username: s.users.username, displayName: s.users.displayName, email: s.users.email, role: s.users.role,
    tier: s.users.membershipTier, since: s.users.membershipSince, createdAt: s.users.createdAt,
    pieces: sql<number>`(select count(*)::int from ${s.editions} where ${s.editions.ownerId} = ${s.users.id} and ${s.editions.status} = 'active')`,
  }).from(s.users).where(where.length ? and(...where) : undefined).orderBy(desc(s.users.createdAt)).limit(300);
}

export async function getMember(id: string) {
  await connection();
  const [u] = await db.select().from(s.users).where(eq(s.users.id, id)).limit(1);
  if (!u) return null;
  const [[orders], [pieces], [cards]] = await Promise.all([
    db.select({ n: count, total: sql<number>`coalesce(sum(${s.orders.totalCents}) filter (where ${s.orders.status} = 'paid'), 0)::int` }).from(s.orders).where(eq(s.orders.userId, id)),
    db.select({ n: count, fine: sql<number>`count(*) filter (where ${s.artworks.kind} in ('print', 'founders_art'))::int` })
      .from(s.editions).innerJoin(s.artworks, eq(s.artworks.id, s.editions.artworkId)).where(and(eq(s.editions.ownerId, id), eq(s.editions.status, "active"))),
    db.select({ n: count }).from(s.registrations).where(eq(s.registrations.userId, id)),
  ]);
  return { user: u, orders: orders.n, spent: orders.total, pieces: pieces.n, finePieces: pieces.fine, cards: cards.n };
}

export async function listAdminLots(eventId?: string) {
  await connection();
  return db.select({
    id: s.lots.id, title: s.lots.title, maker: s.lots.maker, images: s.lots.images, status: s.lots.status, isArt: s.lots.isArt,
    buyNowCents: s.lots.buyNowCents, startingBidCents: s.lots.startingBidCents, auctionStartsAt: s.lots.auctionStartsAt, auctionEndsAt: s.lots.auctionEndsAt,
    soldCents: s.lots.soldCents, eventTitle: s.events.title,
    topBidCents: sql<number | null>`(select max(${s.bids.amountCents}) from ${s.bids} where ${s.bids.lotId} = ${s.lots.id})`,
    bidCount: sql<number>`(select count(*)::int from ${s.bids} where ${s.bids.lotId} = ${s.lots.id})`,
  }).from(s.lots).innerJoin(s.events, eq(s.events.id, s.lots.eventId))
    .where(eventId ? eq(s.lots.eventId, eventId) : undefined).orderBy(asc(s.lots.auctionEndsAt));
}

export async function getAdminLot(id: string) {
  await connection();
  const [lot] = await db.select({ lot: s.lots, buyer: s.users.username }).from(s.lots).leftJoin(s.users, eq(s.users.id, s.lots.buyerId)).where(eq(s.lots.id, id)).limit(1);
  if (!lot) return null;
  const bids = await db.select({ id: s.bids.id, amountCents: s.bids.amountCents, createdAt: s.bids.createdAt, username: s.users.username })
    .from(s.bids).innerJoin(s.users, eq(s.users.id, s.bids.userId)).where(eq(s.bids.lotId, id)).orderBy(desc(s.bids.amountCents), asc(s.bids.createdAt));
  return { ...lot, bids };
}

export async function listAdminFilms() {
  await connection();
  return db.select({ id: s.films.id, slug: s.films.slug, title: s.films.title, kind: s.films.kind, poster: s.films.poster, videoUrl: s.films.videoUrl, publishedAt: s.films.publishedAt, cityName: s.cities.name })
    .from(s.films).leftJoin(s.cities, eq(s.cities.id, s.films.cityId)).orderBy(desc(s.films.publishedAt));
}

export async function getAdminFilm(id: string) {
  await connection();
  const [row] = await db.select().from(s.films).where(eq(s.films.id, id)).limit(1);
  return row ?? null;
}
