// Read queries for pages. Server-only. Each starts with `connection()`: these reads are per
// request (stock, bids and sales change constantly), so they never run while the build
// prerenders pages, and the site builds without a database.
import "server-only";
import { connection } from "next/server";
import { and, asc, desc, eq, gt, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { TIERS } from "@/lib/membership";

const soldCount = sql<number>`(select count(*)::int from ${s.editions} where ${s.editions.artworkId} = ${s.artworks.id})`;
const topBid = sql<number | null>`(select max(${s.bids.amountCents}) from ${s.bids} where ${s.bids.lotId} = ${s.lots.id})`;
const bidCount = sql<number>`(select count(*)::int from ${s.bids} where ${s.bids.lotId} = ${s.lots.id})`;

const artworkCard = {
  id: s.artworks.id, slug: s.artworks.slug, title: s.artworks.title, kind: s.artworks.kind,
  priceCents: s.artworks.priceCents, editionSize: s.artworks.editionSize, images: s.artworks.images,
  artistName: s.artists.name, artistSlug: s.artists.slug, cityName: s.cities.name, citySlug: s.cities.slug,
  sold: soldCount,
};
export type ArtworkCard = Awaited<ReturnType<typeof listArtworks>>[number];

export async function listArtworks(opts: { followedBy?: string; citySlug?: string; artistSlug?: string; limit?: number } = {}) {
  await connection();
  const q = db.select(artworkCard).from(s.artworks)
    .innerJoin(s.artists, eq(s.artists.id, s.artworks.artistId))
    .innerJoin(s.cities, eq(s.cities.id, s.artworks.cityId))
    .$dynamic();
  const where = [];
  if (opts.followedBy) {
    where.push(inArray(s.artworks.artistId,
      db.select({ id: s.follows.artistId }).from(s.follows).where(eq(s.follows.userId, opts.followedBy))));
  }
  if (opts.citySlug) where.push(eq(s.cities.slug, opts.citySlug));
  if (opts.artistSlug) where.push(eq(s.artists.slug, opts.artistSlug));
  if (where.length) q.where(and(...where));
  return q.orderBy(desc(s.artworks.createdAt), asc(s.artworks.title)).limit(opts.limit ?? 50);
}

export async function getArtwork(slug: string) {
  await connection();
  const [row] = await db.select({
    ...artworkCard, description: s.artworks.description, artistBio: s.artists.bio, cityState: s.cities.state,
    releasesAt: s.artworks.releasesAt,
  }).from(s.artworks)
    .innerJoin(s.artists, eq(s.artists.id, s.artworks.artistId))
    .innerJoin(s.cities, eq(s.cities.id, s.artworks.cityId))
    .where(eq(s.artworks.slug, slug)).limit(1);
  return row ?? null;
}

const lotCard = {
  id: s.lots.id, title: s.lots.title, maker: s.lots.maker, images: s.lots.images, status: s.lots.status,
  quantityLabel: s.lots.quantityLabel, retailValueCents: s.lots.retailValueCents, buyNowCents: s.lots.buyNowCents,
  startingBidCents: s.lots.startingBidCents, auctionStartsAt: s.lots.auctionStartsAt, auctionEndsAt: s.lots.auctionEndsAt,
  vipUntil: s.lots.vipUntil, isArt: s.lots.isArt, topBidCents: topBid, bidCount,
};

export async function listOpenLots(limit = 10) {
  await connection();
  return db.select(lotCard).from(s.lots).where(eq(s.lots.status, "open")).orderBy(asc(s.lots.auctionEndsAt)).limit(limit);
}

// Every lot, for the Auctions page: live ones first, then the ones still to come, then the closed.
export async function listLots() {
  await connection();
  return db.select({ ...lotCard, eventSlug: s.events.slug, eventTitle: s.events.title, cityName: s.cities.name })
    .from(s.lots).innerJoin(s.events, eq(s.events.id, s.lots.eventId)).innerJoin(s.cities, eq(s.cities.id, s.events.cityId))
    .orderBy(asc(s.lots.auctionEndsAt));
}

export async function getLot(id: string) {
  await connection();
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [row] = await db.select({
    ...lotCard, description: s.lots.description, eventId: s.events.id, eventSlug: s.events.slug,
    eventTitle: s.events.title, eventStartsAt: s.events.startsAt, hostName: s.events.hostName,
    cityName: s.cities.name, cityState: s.cities.state, soldCents: s.lots.soldCents,
  }).from(s.lots)
    .innerJoin(s.events, eq(s.events.id, s.lots.eventId))
    .innerJoin(s.cities, eq(s.cities.id, s.events.cityId))
    .where(eq(s.lots.id, id)).limit(1);
  return row ?? null;
}

export async function getEvent(slug: string) {
  await connection();
  const [ev] = await db.select({
    event: s.events, cityName: s.cities.name, cityState: s.cities.state, citySlug: s.cities.slug,
  }).from(s.events).innerJoin(s.cities, eq(s.cities.id, s.events.cityId)).where(eq(s.events.slug, slug)).limit(1);
  return ev ?? null;
}

// The event being promoted: the next to start, or the one on now (for a day after it starts).
// One event runs at a time.
export async function getNextEvent() {
  await connection();
  const since = new Date(new Date().getTime() - 86_400_000);
  const [ev] = await db.select({
    id: s.events.id, slug: s.events.slug, title: s.events.title, startsAt: s.events.startsAt,
    cityName: s.cities.name, cityState: s.cities.state,
  }).from(s.events).innerJoin(s.cities, eq(s.cities.id, s.events.cityId))
    .where(gt(s.events.startsAt, since)).orderBy(asc(s.events.startsAt)).limit(1);
  return ev ?? null;
}

const unclaimed = sql`not exists (select 1 from ${s.registrations} where ${s.registrations.cardId} = ${s.cards.id})`;

// The cards a guest can pick from: up to three designs that still have cards left, the most
// plentiful first, so the choice changes as the deck runs down.
export async function listCardOptions(eventId: string) {
  await connection();
  return db.select({ design: s.cards.design, left: sql<number>`count(*)::int` }).from(s.cards)
    .where(and(eq(s.cards.eventId, eventId), unclaimed))
    .groupBy(s.cards.design).orderBy(desc(sql`count(*)`)).limit(3);
}

// My Cards: every collector card someone has claimed, with its event and where it stands.
export async function listMyCards(userId: string) {
  await connection();
  return db.select({
    code: s.cards.code, design: s.cards.design, jokerChoice: s.registrations.jokerChoice,
    fulfillment: s.registrations.fulfillment, shipAddress: s.registrations.shipAddress,
    checkedInAt: s.registrations.checkedInAt, registeredAt: s.registrations.createdAt,
    eventSlug: s.events.slug, eventTitle: s.events.title, eventStartsAt: s.events.startsAt, venue: s.events.venue,
    cityName: s.cities.name, cityState: s.cities.state,
  }).from(s.registrations)
    .innerJoin(s.cards, eq(s.cards.id, s.registrations.cardId))
    .innerJoin(s.events, eq(s.events.id, s.registrations.eventId))
    .innerJoin(s.cities, eq(s.cities.id, s.events.cityId))
    .where(eq(s.registrations.userId, userId)).orderBy(desc(s.events.startsAt));
}

// A card at the door: who registered it, for which event, and whether it was handed over yet.
export async function getCheckIn(code: string) {
  await connection();
  const [row] = await db.select({
    registrationId: s.registrations.id, code: s.cards.code, design: s.cards.design,
    jokerChoice: s.registrations.jokerChoice, fulfillment: s.registrations.fulfillment,
    checkedInAt: s.registrations.checkedInAt,
    displayName: s.users.displayName, username: s.users.username,
    eventTitle: s.events.title, eventStartsAt: s.events.startsAt, cityName: s.cities.name,
  }).from(s.cards)
    .innerJoin(s.registrations, eq(s.registrations.cardId, s.cards.id))
    .innerJoin(s.users, eq(s.users.id, s.registrations.userId))
    .innerJoin(s.events, eq(s.events.id, s.cards.eventId))
    .innerJoin(s.cities, eq(s.cities.id, s.events.cityId))
    .where(eq(s.cards.code, code.trim().toUpperCase())).limit(1);
  return row ?? null;
}

export async function getRegistration(eventId: string, userId: string) {
  await connection();
  const [r] = await db.select({
    design: s.cards.design, code: s.cards.code, jokerChoice: s.registrations.jokerChoice,
    fulfillment: s.registrations.fulfillment,
  }).from(s.registrations).innerJoin(s.cards, eq(s.cards.id, s.registrations.cardId))
    .where(and(eq(s.registrations.eventId, eventId), eq(s.registrations.userId, userId))).limit(1);
  return r ?? null;
}

// The event contract's numbers: revenue by kind, cost, profit and the charity's share.
export async function getScoreboard(eventId: string, costCents: number, charityPercent: number) {
  await connection();
  const byKind = await db.select({ kind: s.orders.kind, cents: sql<number>`sum(${s.orders.totalCents})::int`, buyers: sql<number>`count(distinct ${s.orders.userId})::int` })
    .from(s.orders).where(and(eq(s.orders.eventId, eventId), eq(s.orders.status, "paid"))).groupBy(s.orders.kind);
  const get = (k: string) => byKind.find((r) => r.kind === k)?.cents ?? 0;
  const revenue = byKind.reduce((t, r) => t + r.cents, 0);
  const net = revenue - costCents;
  const charity = net > 0 ? Math.round((net * charityPercent) / 100) : 0;
  const buyers = await db.select({ n: sql<number>`count(distinct ${s.orders.userId})::int` }).from(s.orders)
    .where(and(eq(s.orders.eventId, eventId), eq(s.orders.status, "paid")));
  return {
    revenue, costCents, net, charity, groupProfit: net > 0 ? net - charity : 0,
    tickets: get("ticket"), food: get("food"), products: get("lot"), art: get("art"),
    committed: buyers[0]?.n ?? 0,
    fundedPercent: costCents ? Math.round((revenue / costCents) * 100) : 0,
  };
}

// Every sale at the event, newest first, with who sold and who bought (shown masked to
// anyone who is not a VIP, when the buyer is a VIP).
export async function listEventSales(eventId: string) {
  await connection();
  return db.select({
    id: s.orderItems.id, label: s.orderItems.label, quantity: s.orderItems.quantity, unitPriceCents: s.orderItems.unitPriceCents,
    buyer: s.users.username, buyerRole: s.users.role, buyerTier: s.users.membershipTier, createdAt: s.orders.createdAt, kind: s.orders.kind,
    soldBy: sql<string>`coalesce(${s.artists.name}, ${s.lots.maker}, 'Heart Over Money')`,
    artSlug: s.artworks.slug, lotId: s.lots.id,
  }).from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .innerJoin(s.users, eq(s.users.id, s.orders.userId))
    .leftJoin(s.artworks, eq(s.artworks.id, s.orderItems.artworkId))
    .leftJoin(s.artists, eq(s.artists.id, s.artworks.artistId))
    .leftJoin(s.lots, eq(s.lots.id, s.orderItems.lotId))
    .where(and(eq(s.orders.eventId, eventId), eq(s.orders.status, "paid"), inArray(s.orders.kind, ["art", "lot"])))
    .orderBy(desc(s.orders.createdAt));
}

// Posted photos still on the wall, newest first: one event's, or every event's for the Posts
// feed. Each carries its event, for the hashtags and the link back to the event.
export async function listPhotos(eventId: string | null, viewerId?: string) {
  await connection();
  return db.select({
    id: s.photos.id, image: s.photos.image, caption: s.photos.caption, createdAt: s.photos.createdAt,
    userId: s.photos.userId, username: s.users.username,
    eventSlug: s.events.slug, eventTitle: s.events.title, eventStartsAt: s.events.startsAt, cityName: s.cities.name,
    likes: sql<number>`(select count(*)::int from ${s.photoLikes} where ${s.photoLikes.photoId} = ${s.photos.id})`,
    liked: viewerId
      ? sql<boolean>`exists(select 1 from ${s.photoLikes} where ${s.photoLikes.photoId} = ${s.photos.id} and ${s.photoLikes.userId} = ${viewerId})`
      : sql<boolean>`false`,
    downvoted: viewerId
      ? sql<boolean>`exists(select 1 from ${s.photoDownvotes} where ${s.photoDownvotes.photoId} = ${s.photos.id} and ${s.photoDownvotes.userId} = ${viewerId})`
      : sql<boolean>`false`,
  }).from(s.photos).innerJoin(s.users, eq(s.users.id, s.photos.userId))
    .innerJoin(s.events, eq(s.events.id, s.photos.eventId)).innerJoin(s.cities, eq(s.cities.id, s.events.cityId))
    .where(and(isNull(s.photos.removedAt), eventId ? eq(s.photos.eventId, eventId) : undefined))
    .orderBy(desc(s.photos.createdAt)).limit(100);
}

// Photos taken off the wall, for admins to review and restore.
export async function listRemovedPhotos() {
  await connection();
  return db.select({
    id: s.photos.id, image: s.photos.image, caption: s.photos.caption, username: s.users.username,
    eventTitle: s.events.title, removedAt: s.photos.removedAt, removedBy: s.photos.removedBy,
    downvotes: sql<number>`(select count(*)::int from ${s.photoDownvotes} where ${s.photoDownvotes.photoId} = ${s.photos.id})`,
  }).from(s.photos).innerJoin(s.users, eq(s.users.id, s.photos.userId)).innerJoin(s.events, eq(s.events.id, s.photos.eventId))
    .where(isNotNull(s.photos.removedAt)).orderBy(desc(s.photos.removedAt));
}

export async function listMenu(eventId: string) {
  await connection();
  return db.select().from(s.menuItems).where(eq(s.menuItems.eventId, eventId)).orderBy(asc(s.menuItems.category), asc(s.menuItems.priceCents));
}

export async function listCities() {
  await connection();
  return db.select().from(s.cities).orderBy(asc(s.cities.visitedOn));
}

export async function getCity(slug: string) {
  await connection();
  const [city] = await db.select().from(s.cities).where(eq(s.cities.slug, slug)).limit(1);
  return city ?? null;
}

export async function getCertificate(code: string) {
  await connection();
  const [row] = await db.select({
    editionId: s.editions.id, ownerId: s.editions.ownerId, status: s.editions.status, statusNote: s.editions.statusNote,
    code: s.editions.certificateCode, number: s.editions.number, issuedAt: s.editions.issuedAt,
    title: s.artworks.title, slug: s.artworks.slug, editionSize: s.artworks.editionSize, kind: s.artworks.kind,
    images: s.artworks.images, description: s.artworks.description,
    artistName: s.artists.name, artistBio: s.artists.bio,
    cityName: s.cities.name, cityState: s.cities.state, citySlug: s.cities.slug, songTitle: s.cities.songTitle,
    story: s.cities.story, cityId: s.cities.id, artistSlug: s.artists.slug,
    owners: sql<number>`(select count(*)::int from ${s.provenance} where ${s.provenance.editionId} = ${s.editions.id})`,
  }).from(s.editions)
    .innerJoin(s.artworks, eq(s.artworks.id, s.editions.artworkId))
    .innerJoin(s.artists, eq(s.artists.id, s.artworks.artistId))
    .innerJoin(s.cities, eq(s.cities.id, s.artworks.cityId))
    .where(eq(s.editions.certificateCode, code)).limit(1);
  return row ?? null;
}

export async function listVault(userId: string) {
  await connection();
  return db.select({
    code: s.editions.certificateCode, number: s.editions.number, issuedAt: s.editions.issuedAt,
    title: s.artworks.title, slug: s.artworks.slug, editionSize: s.artworks.editionSize, images: s.artworks.images,
    kind: s.artworks.kind, cityName: s.cities.name, status: s.editions.status,
  }).from(s.editions)
    .innerJoin(s.artworks, eq(s.artworks.id, s.editions.artworkId))
    .innerJoin(s.cities, eq(s.cities.id, s.artworks.cityId))
    .where(eq(s.editions.ownerId, userId)).orderBy(desc(s.editions.issuedAt));
}

// Seats taken in the 700 Club (its tier and the ones above it).
export async function clubSeatsTaken() {
  await connection();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.users)
    .where(inArray(s.users.membershipTier, TIERS.filter((t) => t.club).map((t) => t.id)));
  return n;
}

export async function getCart(userId: string) {
  await connection();
  return db.select({
    artworkId: s.artworks.id, slug: s.artworks.slug, title: s.artworks.title, images: s.artworks.images,
    priceCents: s.artworks.priceCents, editionSize: s.artworks.editionSize, quantity: s.cartItems.quantity,
    artistName: s.artists.name, sold: soldCount,
  }).from(s.cartItems)
    .innerJoin(s.artworks, eq(s.artworks.id, s.cartItems.artworkId))
    .innerJoin(s.artists, eq(s.artists.id, s.artworks.artistId))
    .where(eq(s.cartItems.userId, userId)).orderBy(asc(s.artworks.title));
}

export async function listOrders(userId: string) {
  await connection();
  return db.select().from(s.orders).where(eq(s.orders.userId, userId)).orderBy(desc(s.orders.createdAt)).limit(20);
}

export type SearchFilters = { available?: boolean; type?: "art" | "merch" | "shoes" };

// Search across the site. `available` leaves out sold-out pieces; `type` narrows the art to
// fine art (prints and founders art), merch or shoes.
export async function search(term: string, filters: SearchFilters = {}) {
  await connection();
  const like = `%${term.replace(/[%_]/g, "")}%`;
  const artWhere = [or(ilike(s.artworks.title, like), ilike(s.artists.name, like), ilike(s.cities.name, like))];
  if (filters.available) artWhere.push(sql`${soldCount} < ${s.artworks.editionSize}`);
  if (filters.type === "art") artWhere.push(inArray(s.artworks.kind, ["print", "founders_art"]));
  if (filters.type === "merch" || filters.type === "shoes") artWhere.push(eq(s.artworks.kind, filters.type));
  const [artworks, lots, cities, artists, events, films] = await Promise.all([
    db.select(artworkCard).from(s.artworks)
      .innerJoin(s.artists, eq(s.artists.id, s.artworks.artistId))
      .innerJoin(s.cities, eq(s.cities.id, s.artworks.cityId))
      .where(and(...artWhere)).limit(30),
    db.select(lotCard).from(s.lots).where(and(or(ilike(s.lots.title, like), ilike(s.lots.maker, like)),
      filters.available ? eq(s.lots.status, "open") : undefined)).limit(10),
    db.select().from(s.cities).where(ilike(s.cities.name, like)).limit(10),
    db.select({ slug: s.artists.slug, name: s.artists.name }).from(s.artists).where(ilike(s.artists.name, like)).limit(10),
    db.select({ slug: s.events.slug, title: s.events.title, startsAt: s.events.startsAt, cityName: s.cities.name })
      .from(s.events).innerJoin(s.cities, eq(s.cities.id, s.events.cityId))
      .where(or(ilike(s.events.title, like), ilike(s.cities.name, like))).limit(10),
    db.select({ slug: s.films.slug, title: s.films.title, kind: s.films.kind }).from(s.films)
      .leftJoin(s.cities, eq(s.cities.id, s.films.cityId))
      .where(or(ilike(s.films.title, like), ilike(s.cities.name, like))).limit(10),
  ]);
  return { artworks, lots, cities, artists, events, films };
}

export async function getArtist(slug: string, viewerId?: string) {
  await connection();
  const [row] = await db.select({
    id: s.artists.id, slug: s.artists.slug, name: s.artists.name, bio: s.artists.bio,
    followers: sql<number>`(select count(*)::int from ${s.follows} where ${s.follows.artistId} = ${s.artists.id})`,
    following: viewerId
      ? sql<boolean>`exists(select 1 from ${s.follows} where ${s.follows.artistId} = ${s.artists.id} and ${s.follows.userId} = ${viewerId})`
      : sql<boolean>`false`,
  }).from(s.artists).where(eq(s.artists.slug, slug)).limit(1);
  return row ?? null;
}

export async function listArtists() {
  await connection();
  return db.select({ slug: s.artists.slug, name: s.artists.name, bio: s.artists.bio }).from(s.artists).orderBy(asc(s.artists.name));
}

const filmCard = {
  slug: s.films.slug, title: s.films.title, kind: s.films.kind, summary: s.films.summary, poster: s.films.poster,
  minutes: s.films.minutes, publishedAt: s.films.publishedAt, videoUrl: s.films.videoUrl,
  cityName: s.cities.name, citySlug: s.cities.slug,
};

export async function listFilms(kind?: string) {
  await connection();
  return db.select(filmCard).from(s.films).leftJoin(s.cities, eq(s.cities.id, s.films.cityId))
    .where(kind ? sql`${s.films.kind} = ${kind}` : undefined).orderBy(desc(s.films.publishedAt));
}

export async function getFilm(slug: string) {
  await connection();
  const [row] = await db.select({ ...filmCard, body: s.films.body, cityState: s.cities.state })
    .from(s.films).leftJoin(s.cities, eq(s.cities.id, s.films.cityId)).where(eq(s.films.slug, slug)).limit(1);
  return row ?? null;
}

// The film to show with a city's art: its music video if it has one, else its newest film.
export async function filmForCity(citySlug: string) {
  await connection();
  const [row] = await db.select({ slug: s.films.slug, title: s.films.title, kind: s.films.kind })
    .from(s.films).innerJoin(s.cities, eq(s.cities.id, s.films.cityId)).where(eq(s.cities.slug, citySlug))
    .orderBy(sql`${s.films.kind} = 'music_video' desc`, desc(s.films.publishedAt)).limit(1);
  return row ?? null;
}
