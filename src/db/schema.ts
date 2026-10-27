// The database schema (Drizzle ORM, Postgres). Money is stored in cents.
import {
  pgTable, pgEnum, uuid, text, integer, boolean, timestamp, jsonb, primaryKey, uniqueIndex, index,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["member", "vip", "admin"]);
export const artworkKindEnum = pgEnum("artwork_kind", ["merch", "shoes", "print", "founders_art"]);
export const tierEnum = pgEnum("membership_tier", [
  "supporter", "mission_partner", "seven_hundred_club", "city_builder", "mission_sponsor",
]);
export const lotStatusEnum = pgEnum("lot_status", ["open", "sold", "closed"]);
export const orderKindEnum = pgEnum("order_kind", ["art", "lot", "food", "ticket", "membership"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid"]);
export const fulfillmentEnum = pgEnum("fulfillment", ["pickup", "ship"]);
export const cardDesignEnum = pgEnum("card_design", ["joker", "queen", "rabbit"]);
export const jokerChoiceEnum = pgEnum("joker_choice", ["kept", "gift_card"]);
export const photoRemovalEnum = pgEnum("photo_removal", ["admin", "community"]);
export const filmKindEnum = pgEnum("film_kind", ["music_video", "city_film", "mission_story", "behind_the_scenes"]);
export const provenanceKindEnum = pgEnum("provenance_kind", ["issued", "transferred"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  // Onboarding's "Tell us about yourself": a line under the name, as in the messenger.
  tagline: text("tagline"),
  role: roleEnum("role").notNull().default("member"),
  membershipTier: tierEnum("membership_tier"),
  membershipSince: timestamp("membership_since", { withTimezone: true }),
  // Settings: where to ship by default (checkout and the card process fill it in), and
  // whether to get news of drops and events by email.
  shipAddress: text("ship_address"),
  emailUpdates: boolean("email_updates").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// "Forgot details?": a one-time link to set a new password, valid for an hour. Only a hash of
// the token is stored, so the table can't be used to sign in.
export const passwordResets = pgTable("password_resets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  bio: text("bio"),
});

export const follows = pgTable("follows", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artistId: uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.userId, t.artistId] })]);

// A city the movement visits. Each one has its own collection and a permanent story page,
// which certificates of authenticity link to.
export const cities = pgTable("cities", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  state: text("state").notNull(),
  visitedOn: timestamp("visited_on", { withTimezone: true }),
  story: text("story").notNull(),
  songTitle: text("song_title"),
  videoUrl: text("video_url"),
  heroImage: text("hero_image").notNull(),
});

// A limited-edition piece. `editionSize` is a promise: never more than that many are sold.
export const artworks = pgTable("artworks", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  artistId: uuid("artist_id").notNull().references(() => artists.id),
  cityId: uuid("city_id").notNull().references(() => cities.id),
  kind: artworkKindEnum("kind").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  editionSize: integer("edition_size").notNull(),
  images: jsonb("images").$type<string[]>().notNull(),
  // Short code used in certificate IDs, e.g. JSF for the artist.
  certificatePrefix: text("certificate_prefix").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One numbered piece of an edition, sold to someone, with its certificate of authenticity.
export const editions = pgTable("editions", {
  id: uuid("id").primaryKey().defaultRandom(),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id),
  number: integer("number").notNull(),
  ownerId: uuid("owner_id").references(() => users.id),
  orderId: uuid("order_id"),
  certificateCode: text("certificate_code").notNull().unique(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("editions_artwork_number").on(t.artworkId, t.number)]);

// A numbered piece's ownership record: issued to its first collector, and every later transfer
// (resale isn't open yet, but the record is kept from the first sale so the piece's history
// follows its certificate ID).
export const provenance = pgTable("provenance", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id").notNull().references(() => editions.id, { onDelete: "cascade" }),
  kind: provenanceKindEnum("kind").notNull(),
  fromUserId: uuid("from_user_id").references(() => users.id),
  toUserId: uuid("to_user_id").references(() => users.id),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("provenance_edition").on(t.editionId)]);

export type Sponsor = { name: string; logo?: string };
export type EventDocument = { name: string; url: string };

// An event, run as a public "event contract": its cost goal, sponsors and every sale are shown.
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  cityId: uuid("city_id").notNull().references(() => cities.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  venue: text("venue").notNull(),
  description: text("description").notNull(),
  costCents: integer("cost_cents").notNull(),
  // Share of the event's profit given to its charity, in percent.
  charityPercent: integer("charity_percent").notNull().default(50),
  charityName: text("charity_name").notNull(),
  hostName: text("host_name").notNull(),
  sponsors: jsonb("sponsors").$type<Sponsor[]>().notNull().default([]),
  documents: jsonb("documents").$type<EventDocument[]>().notNull().default([]),
  // The contract's terms (development overview page 4), one paragraph per line.
  terms: text("terms").notNull().default(""),
});

// An Art + Charity auction lot: bought outright with Buy Now before the event, or bid on
// live at the event between auctionStartsAt and auctionEndsAt.
export const lots = pgTable("lots", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  title: text("title").notNull(),
  maker: text("maker").notNull(),
  description: text("description").notNull(),
  images: jsonb("images").$type<string[]>().notNull(),
  quantityLabel: text("quantity_label").notNull(),
  retailValueCents: integer("retail_value_cents").notNull(),
  buyNowCents: integer("buy_now_cents"),
  startingBidCents: integer("starting_bid_cents").notNull(),
  auctionStartsAt: timestamp("auction_starts_at", { withTimezone: true }).notNull(),
  auctionEndsAt: timestamp("auction_ends_at", { withTimezone: true }).notNull(),
  // VIPs see Buy Now deals before everyone else, until this moment.
  vipUntil: timestamp("vip_until", { withTimezone: true }),
  // Art lots are for VIPs throughout. Anyone signed in can bid on the others at the live
  // auction (development overview page 6); Buy Now before the event is a VIP deal either way.
  isArt: boolean("is_art").notNull().default(true),
  status: lotStatusEnum("status").notNull().default("open"),
  buyerId: uuid("buyer_id").references(() => users.id),
  soldCents: integer("sold_cents"),
}, (t) => [index("lots_event").on(t.eventId)]);

export const bids = pgTable("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  lotId: uuid("lot_id").notNull().references(() => lots.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("bids_lot").on(t.lotId)]);

export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  priceCents: integer("price_cents").notNull(),
});

export const cartItems = pgTable("cart_items", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id),
  quantity: integer("quantity").notNull().default(1),
}, (t) => [primaryKey({ columns: [t.userId, t.artworkId] })]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  kind: orderKindEnum("kind").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  totalCents: integer("total_cents").notNull(),
  eventId: uuid("event_id").references(() => events.id),
  fulfillment: fulfillmentEnum("fulfillment"),
  shipAddress: text("ship_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("orders_event").on(t.eventId)]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  artworkId: uuid("artwork_id").references(() => artworks.id),
  lotId: uuid("lot_id").references(() => lots.id),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id),
  quantity: integer("quantity").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull(),
});

// A photo posted to an event's photo wall. A removed photo (by an admin, or by enough of the
// community's thumbs-downs) leaves the wall but is kept, so an admin can restore it.
export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  image: text("image").notNull(),
  caption: text("caption").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  removedBy: photoRemovalEnum("removed_by"),
}, (t) => [index("photos_event").on(t.eventId)]);

export const photoLikes = pgTable("photo_likes", {
  photoId: uuid("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.photoId, t.userId] })]);

export const photoDownvotes = pgTable("photo_downvotes", {
  photoId: uuid("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.photoId, t.userId] })]);

// One collector card in an event's printed deck, each with its own code. Registering for the
// event reserves one, and the guest collects it at the door (or has it mailed).
export const cards = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  code: text("code").notNull().unique(),
  design: cardDesignEnum("design").notNull(),
}, (t) => [index("cards_event").on(t.eventId)]);

// Registering for an event through the card process at /events: the card picked, and, for
// the Joker, what was chosen against the clock: keeping it (VIP access at the event, which
// the guest doesn't know when choosing) or a guaranteed $20 gift card to spend there.
export const registrations = pgTable("registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  cardId: uuid("card_id").notNull().unique().references(() => cards.id),
  jokerChoice: jokerChoiceEnum("joker_choice"),
  fulfillment: fulfillmentEnum("fulfillment").notNull().default("pickup"),
  shipAddress: text("ship_address"),
  // When the card was handed over at the door (staff scan its code at /admin/check-in).
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("registrations_event_user").on(t.eventId, t.userId)]);

// The Joker's two minutes, kept on the server: when the clock started for this guest, and what
// they chose while it ran. Leaving and coming back doesn't restart it, and a choice made after
// time is up doesn't count (the Joker is kept).
export const jokerTimers = pgTable("joker_timers", {
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  choice: jokerChoiceEnum("choice"),
  chosenAt: timestamp("chosen_at", { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.eventId, t.userId] })]);

// Films and stories (business plan, "Website Blueprint"): music videos, city films, mission
// stories and behind the scenes, each tied to a city when it has one.
export const films = pgTable("films", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  kind: filmKindEnum("kind").notNull(),
  cityId: uuid("city_id").references(() => cities.id),
  summary: text("summary").notNull(),
  body: text("body").notNull(),
  poster: text("poster").notNull(),
  // Empty until the film is published: the page says it premieres soon instead of linking nowhere.
  videoUrl: text("video_url"),
  minutes: integer("minutes"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});

// Messages sent from the Contact page.
export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
