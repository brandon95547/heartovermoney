// Development seed: sample artists, cities, artworks, an Art + Charity event with auction
// lots, menu, photos and sales, onboarding cards, films, and demo accounts. Wipes the data first.
//
//   npm run db:seed
//
// Demo accounts, all with the password `heart-over-money` locally. On staging, SEED_PASSWORD
// (in the server's .env) replaces it, so the public site doesn't use the one written here:
//   admin@heartovermoney.test   admin
//   vip@heartovermoney.test     VIP, 700 Club member
//   member@heartovermoney.test  member
// The event's three registered guests, with conversations in the Connections Messenger:
//   sarah@example.test, dolly@example.test, bryan@example.test
//
// Products and auction lots use the example pictures in public/examples/products, and posts those
// in public/examples/posts; the rest (cities, films) are placeholders drawn here into
// public/placeholders/ until real ones arrive.
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql as rawSql } from "drizzle-orm";
import postgres from "postgres";
import * as s from "../src/db/schema";
import { certificateCode } from "../src/lib/certificates";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema: s });

const PLACEHOLDERS = path.join(process.cwd(), "public", "placeholders");

// A flat placeholder picture: two-tone gradient, soft shapes, and a label.
function placeholder(name: string, label: string, hue: number, w = 800, h = 1000): string {
  fs.mkdirSync(PLACEHOLDERS, { recursive: true });
  const esc = label.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 45% 32%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 55% 14%)"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<circle cx="${w * 0.72}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.28}" fill="hsl(${(hue + 20) % 360} 60% 60% / 0.25)"/>
<rect x="${w * 0.12}" y="${h * 0.45}" width="${w * 0.4}" height="${h * 0.3}" rx="12" fill="hsl(${hue} 30% 90% / 0.12)"/>
<text x="${w / 2}" y="${h - 48}" fill="#fff" font-family="Arial, sans-serif" font-size="${Math.round(w / 22)}" font-weight="700" text-anchor="middle" letter-spacing="2">${esc.toUpperCase()}</text>
</svg>`;
  fs.writeFileSync(path.join(PLACEHOLDERS, `${name}.svg`), svg);
  return `/placeholders/${name}.svg`;
}

// A product's example pictures in public/examples/products (see its CREDITS.md): the piece, then
// a detail of it.
const product = (name: string) => [`/examples/products/${name}-1.webp`, `/examples/products/${name}-2.webp`];

const day = 86_400_000;

async function main() {
  // Wipe in one statement so foreign keys don't care about the order.
  await db.execute(rawSql`truncate table photo_downvotes, photo_likes, photos, order_items, orders, cart_items, bids, lots,
    menu_items, provenance, editions, artworks, follows, artists, messages, connections, registrations, joker_timers, cards, films, events, cities,
    password_resets, contact_messages, audit_log, site_content, users restart identity cascade`);
  fs.rmSync(PLACEHOLDERS, { recursive: true, force: true });

  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD || "heart-over-money", 10);
  const people = [
    ["admin@heartovermoney.test", "hom_admin", "HOM Admin", "admin", null],
    ["vip@heartovermoney.test", "faithful_collector", "Grace Collector", "vip", "seven_hundred_club"],
    ["member@heartovermoney.test", "first_time_guest", "Sam Guest", "member", null],
    ["fred@example.test", "FredMack", "Fred Mack", "member", "supporter"],
    ["dolly@example.test", "DizzyDolly", "Dolly Diaz", "vip", "city_builder"],
    ["jason@example.test", "JasonMackMiller", "Jason Miller", "member", null],
    ["monica@example.test", "MonicaBarkley", "Monica Barkley", "member", "mission_partner"],
    ["bryan@example.test", "BryanCho", "Bryan Cho", "vip", "seven_hundred_club"],
    ["sarah@example.test", "sarah_parish", "Sarah Parish", "member", null],
  ] as const;
  const users = await db.insert(s.users).values(people.map(([email, username, displayName, role, tier]) => ({
    email, username, displayName, role, passwordHash,
    membershipTier: tier, membershipSince: tier ? new Date(Date.now() - 40 * day) : null,
    tagline: role === "vip" ? "joyful collector" : "first time at an Art + Charity night",
  }))).returning();
  const u = Object.fromEntries(users.map((x) => [x.username, x]));

  const artists = await db.insert(s.artists).values([
    { slug: "jesse-shane-fisher", name: "Jesse Shane Fisher", bio: "Founder and creative director. Paints each city's founders edition." },
    { slug: "lovealways", name: "LoveAlways", bio: "Street artist working in bold color." },
    { slug: "betty-w", name: "Betty W", bio: "Printmaker." },
    { slug: "matt-mailhott", name: "Matt Mailhott", bio: "Sculptor." },
    { slug: "nathan-marlow", name: "Nathan Marlow", bio: "Mixed media." },
  ]).returning();
  const a = Object.fromEntries(artists.map((x) => [x.slug, x]));

  const cities = await db.insert(s.cities).values([
    { slug: "charlotte", name: "Charlotte", state: "NC", visitedOn: new Date("2026-09-14T00:00:00Z"),
      story: "Charlotte is the founding collection: the first city, where the movement's visual language began. A week of public worship, prayer on the streets and music recorded with local musicians became this collection.",
      songTitle: "Charlotte (Live)", videoUrl: null, heroImage: placeholder("city-charlotte", "Charlotte", 260, 1600, 900) },
    { slug: "charleston", name: "Charleston", state: "SC", visitedOn: new Date("2026-10-12T00:00:00Z"),
      story: "Charleston brought a very different light: harbor mornings, church partners, and a choir that joined the music video.",
      songTitle: "Harbor Song", videoUrl: null, heroImage: placeholder("city-charleston", "Charleston", 200, 1600, 900) },
    { slug: "nashville", name: "Nashville", state: "TN", visitedOn: null,
      story: "Next city. The Nashville collection will be revealed after the trip.",
      songTitle: null, videoUrl: null, heroImage: placeholder("city-nashville", "Nashville", 20, 1600, 900) },
  ]).returning();
  const c = Object.fromEntries(cities.map((x) => [x.slug, x]));

  const art = [
    ["jesus-multiplies", "Jesus Multiplies", "jesse-shane-fisher", "charlotte", "founders_art", 500000, 10, "JSF"],
    ["charlotte-city-edition", "Charlotte City Edition", "jesse-shane-fisher", "charlotte", "print", 32500, 75, "JSF"],
    ["charlotte-collector-edition", "Charlotte Collector Edition", "jesse-shane-fisher", "charlotte", "print", 125000, 25, "JSF"],
    ["heart-over-money-tee", "Heart Over Money Tee", "jesse-shane-fisher", "charlotte", "merch", 3500, 1000, "JSF"],
    ["good-news-shoes-charlotte", "Good News Shoes: Charlotte", "lovealways", "charlotte", "shoes", 12000, 250, "LA"],
    ["queen-of-hearts", "Queen of Hearts", "lovealways", "charleston", "print", 150000, 50, "LA"],
    ["harbor-light", "Harbor Light", "betty-w", "charleston", "print", 55000, 50, "BW"],
    ["mission-bull", "Mission Bull", "matt-mailhott", "charleston", "founders_art", 550000, 5, "MM"],
    ["white-light", "White Light", "nathan-marlow", "charleston", "print", 150000, 30, "NM"],
  ] as const;
  const artworks = await db.insert(s.artworks).values(art.map(([slug, title, artist, city, kind, price, size, prefix]) => ({
    slug, title, artistId: a[artist].id, cityId: c[city].id, kind, priceCents: price, editionSize: size,
    certificatePrefix: prefix,
    description: `${title} is part of the ${c[city].name} collection: individually numbered, ${size} in the edition, never reprinted in this size or format. Each piece comes with a certificate of authenticity and a QR code to the ${c[city].name} story.`,
    images: product(slug),
  }))).returning();
  const w = Object.fromEntries(artworks.map((x) => [x.slug, x]));

  // Some pieces already collected, so editions, sold-out states and the Vault have content.
  const sell = async (slug: string, username: string, count: number, eventId?: string) => {
    const piece = w[slug];
    const city = cities.find((x) => x.id === piece.cityId)!;
    const [order] = await db.insert(s.orders).values({
      userId: u[username].id, kind: "art", status: "paid", totalCents: piece.priceCents * count,
      eventId, fulfillment: "ship", shipAddress: "Sample address",
    }).returning();
    await db.insert(s.orderItems).values({ orderId: order.id, label: piece.title, artworkId: piece.id, quantity: count, unitPriceCents: piece.priceCents });
    const already = await db.$count(s.editions, rawSql`${s.editions.artworkId} = ${piece.id}`);
    for (let i = 1; i <= count; i++) {
      const number = already + i;
      const issuedAt = new Date(Date.now() - 10 * day);
      const [edition] = await db.insert(s.editions).values({
        artworkId: piece.id, number, ownerId: u[username].id, orderId: order.id, issuedAt,
        certificateCode: certificateCode({ title: piece.title, number, editionSize: piece.editionSize, city: city.name, state: city.state, issuedAt, artistPrefix: piece.certificatePrefix }),
      }).returning();
      await db.insert(s.provenance).values({ editionId: edition.id, kind: "issued", toUserId: u[username].id, at: issuedAt });
    }
  };

  const event = (await db.insert(s.events).values({
    slug: "charlotte-art-charity", title: "Art + Charity", cityId: c.charlotte.id,
    startsAt: new Date(Date.now() + 3 * day), venue: "Uptown Charlotte",
    description: "An evening of worship, music and art. Every limited-edition piece sold tonight is recorded on the scoreboard, and the profit after the event's cost is shared with tonight's charity.",
    costCents: 1_000_000, charityPercent: 50, charityName: "Charlotte Mission Partners", hostName: "Heart Over Money",
    sponsors: [{ name: "Good News Shoes" }, { name: "Natural Fabric" }, { name: "JSF Artwork" }],
    documents: [
      { name: "Event plan.txt", url: "/documents/charlotte-event-plan.txt" },
      { name: "Projected impact.txt", url: "/documents/charlotte-projected-impact.txt" },
    ],
    terms: [
      "This is a public event contract: every ticket, plate, product and piece of art sold for the event is counted on the scoreboard as it happens.",
      "The event's cost is covered first. Half of everything raised after the cost goes to Charlotte Mission Partners; the rest sends the mission to the next city.",
      "Limited-edition art is for VIP members. Each piece is numbered, never reprinted in its size or format, and comes with a certificate of authenticity.",
      "Collector cards are claimed at the door with the code in My Cards, or mailed to the address given when registering.",
    ].join("\n"),
  }).returning())[0];

  await sell("jesus-multiplies", "faithful_collector", 1);
  await sell("charlotte-city-edition", "faithful_collector", 2, event.id);
  await sell("charlotte-city-edition", "FredMack", 1, event.id);
  await sell("charlotte-collector-edition", "DizzyDolly", 1, event.id);
  await sell("queen-of-hearts", "BryanCho", 1, event.id);
  await sell("mission-bull", "DizzyDolly", 5); // the whole edition: sold out

  const eventStart = event.startsAt;
  const lots = await db.insert(s.lots).values([
    { eventId: event.id, title: "Founders Edition Canvas", maker: "Jesse Shane Fisher",
      description: "An original canvas painted live at the Charlotte worship night. One of one.",
      images: product("lot-founders-canvas"),
      quantityLabel: "1 original canvas", retailValueCents: 499900, buyNowCents: 222200, startingBidCents: 100000,
      auctionStartsAt: new Date(eventStart.getTime() + 60 * 60_000), auctionEndsAt: new Date(eventStart.getTime() + 2 * 60 * 60_000),
      vipUntil: new Date(Date.now() + 1 * day) },
    { eventId: event.id, title: "Collector Print Bundle", maker: "Betty W",
      description: "A bulk lot of 25 numbered Harbor Light prints, sold together to the winning bidder.",
      images: product("lot-print-bundle"),
      quantityLabel: "Bulk lot of 25", retailValueCents: 187500, buyNowCents: 100000, startingBidCents: 50000,
      auctionStartsAt: new Date(Date.now() - 60 * 60_000), auctionEndsAt: new Date(Date.now() + 2 * day) },
    { eventId: event.id, title: "Hand-painted Good News Shoes", maker: "LoveAlways",
      description: "One pair, painted by hand for this night. Size chosen with the winner.",
      images: product("lot-shoes"),
      quantityLabel: "1 pair", retailValueCents: 60000, buyNowCents: 45000, startingBidCents: 20000, isArt: false,
      auctionStartsAt: new Date(eventStart.getTime() + 60 * 60_000), auctionEndsAt: new Date(eventStart.getTime() + 2 * 60 * 60_000) },
  ]).returning();
  await db.insert(s.bids).values([
    { lotId: lots[1].id, userId: u.FredMack.id, amountCents: 55000 },
    { lotId: lots[1].id, userId: u.MonicaBarkley.id, amountCents: 62500 },
    { lotId: lots[1].id, userId: u.BryanCho.id, amountCents: 75000 },
  ]);

  const menu = await db.insert(s.menuItems).values([
    { eventId: event.id, name: "Barbecue plate", category: "Food", priceCents: 1400 },
    { eventId: event.id, name: "Veggie plate", category: "Food", priceCents: 1200 },
    { eventId: event.id, name: "Peach cobbler", category: "Food", priceCents: 600 },
    { eventId: event.id, name: "Sweet tea", category: "Drinks", priceCents: 400 },
    { eventId: event.id, name: "Coffee", category: "Drinks", priceCents: 300 },
    { eventId: event.id, name: "Water", category: "Drinks", priceCents: 200 },
  ]).returning();

  // Tickets and food sold so far, for the scoreboard.
  for (const [username, cents] of [["faithful_collector", 25000], ["DizzyDolly", 25000], ["BryanCho", 25000]] as const) {
    const [o] = await db.insert(s.orders).values({ userId: u[username].id, kind: "ticket", status: "paid", totalCents: cents, eventId: event.id }).returning();
    await db.insert(s.orderItems).values({ orderId: o.id, label: "VIP ticket", unitPriceCents: cents });
  }
  for (const username of ["FredMack", "JasonMackMiller", "MonicaBarkley", "sarah_parish"]) {
    const [o] = await db.insert(s.orders).values({ userId: u[username].id, kind: "food", status: "paid", totalCents: menu[0].priceCents + menu[3].priceCents, eventId: event.id }).returning();
    await db.insert(s.orderItems).values([
      { orderId: o.id, label: menu[0].name, menuItemId: menu[0].id, unitPriceCents: menu[0].priceCents },
      { orderId: o.id, label: menu[3].name, menuItemId: menu[3].id, unitPriceCents: menu[3].priceCents },
    ]);
  }

  // Example photos (public/examples/posts, sources in its CREDITS.md), oldest first.
  const captions = [
    ["FredMack", "Lost in the founders canvas", "founders-canvas", ["art", "exhibitjoy"]],
    ["BryanCho", "Even the dog came for the barbecue", "barbecue-dog", ["happenings"]],
    ["MonicaBarkley", "Coffee by the water before the doors opened", "coffee-by-the-water", ["happenings"]],
    ["DizzyDolly", "Fifty-one years married and still laughing", "laughing-couple", ["love", "joy"]],
    ["JasonMackMiller", "Nobody stopped smiling after the choir's last song", "choir-smile", ["worship", "choir", "joy"]],
    ["sarah_parish", "Dancing on the lawn while the band warmed up", "lawn-dance", ["worship", "healing", "love"]],
  ] as const;
  const photos = await db.insert(s.photos).values(captions.map(([username, caption, file, hashtags], i) => ({
    eventId: event.id, userId: u[username].id, caption, hashtags: [...hashtags],
    image: `/examples/posts/${file}.webp`,
    createdAt: new Date(Date.now() - (captions.length - i) * 7 * 60_000),
  }))).returning();
  await db.insert(s.photoLikes).values(photos.flatMap((p, i) => users.slice(0, 3 + (i % 5)).map((x) => ({ photoId: p.id, userId: x.id }))));

  await db.insert(s.follows).values([
    { userId: u.faithful_collector.id, artistId: a["jesse-shane-fisher"].id },
    { userId: u.faithful_collector.id, artistId: a.lovealways.id },
    { userId: u.first_time_guest.id, artistId: a["nathan-marlow"].id },
  ]);

  // The Charlotte deck: 30 collector cards, the Jokers scarce. Three guests have registered.
  const deck = [...Array(4).fill("joker"), ...Array(12).fill("queen"), ...Array(14).fill("rabbit")] as ("joker" | "queen" | "rabbit")[];
  const cards = await db.insert(s.cards).values(deck.map((design, i) => ({
    eventId: event.id, code: `HOM-${String(i + 1).padStart(4, "0")}`, design,
  }))).returning();
  const firstOf = (design: string, skip = 0) => cards.filter((c) => c.design === design)[skip];
  await db.insert(s.registrations).values([
    { eventId: event.id, userId: u.BryanCho.id, cardId: firstOf("joker").id, jokerChoice: "kept" as const },
    { eventId: event.id, userId: u.DizzyDolly.id, cardId: firstOf("queen").id },
    { eventId: event.id, userId: u.sarah_parish.id, cardId: firstOf("rabbit").id, fulfillment: "ship" as const, shipAddress: "12 Elm Street, Charlotte, NC 28202" },
  ]);

  // Their conversations in the Connections Messenger. Bryan and Sarah have connected; Dolly
  // has asked to connect with Sarah, who hasn't yet. Dolly's last message to Sarah is unread.
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);
  const msg = (from: string, to: string, minutes: number, body: string, read = true) =>
    ({ eventId: event.id, senderId: u[from].id, recipientId: u[to].id, body, createdAt: ago(minutes), readAt: read ? ago(minutes - 1) : null });
  await db.insert(s.messages).values([
    msg("DizzyDolly", "BryanCho", 4 * 24 * 60, "Did you keep the Joker? I hear it's worth it."),
    msg("BryanCho", "DizzyDolly", 4 * 24 * 60 - 12, "I kept it. Can't say more!"),
    msg("BryanCho", "sarah_parish", 27 * 60, "Loved your post from the lawn. Which band was warming up?"),
    msg("sarah_parish", "BryanCho", 26 * 60, "The choir from Tryon Street! They're singing again at the event."),
    msg("sarah_parish", "DizzyDolly", 190, "Hi Dolly! Is this your first Art + Charity night too?"),
    msg("DizzyDolly", "sarah_parish", 175, "My third! Fifty-one years married, and my husband still dances at every one."),
    msg("DizzyDolly", "sarah_parish", 50, "Saving you a seat near the stage. Are you bringing anyone?", false),
  ]);
  await db.insert(s.connections).values([
    { userId: u.BryanCho.id, otherId: u.sarah_parish.id, eventId: event.id },
    { userId: u.sarah_parish.id, otherId: u.BryanCho.id, eventId: event.id },
    { userId: u.DizzyDolly.id, otherId: u.sarah_parish.id, eventId: event.id },
  ]);

  // Films and stories. Without a video URL a film's page says it premieres soon.
  const films = await db.insert(s.films).values([
    { slug: "charlotte-live", title: "Charlotte (Live)", kind: "music_video" as const, cityId: c.charlotte.id, minutes: 4,
      summary: "The song recorded with Charlotte's musicians on the last night of the trip.",
      body: "Recorded live on the steps where the week's public worship began, with a choir from the church on Tryon Street. Every piece in the Charlotte collection is tied to this song.",
      poster: placeholder("film-charlotte-live", "Charlotte (Live)", 250, 1600, 900), publishedAt: new Date("2026-09-20T16:00:00Z") },
    { slug: "charlotte-the-founding-city", title: "Charlotte: The Founding City", kind: "city_film" as const, cityId: c.charlotte.id, minutes: 12,
      summary: "A week in the first city, from the first prayer walk to the first collection.",
      body: "The film follows the team through a week of worship, prayer on the streets and the recording of Charlotte (Live), and the people whose stories became the founding collection.",
      poster: placeholder("film-charlotte-city", "The Founding City", 275, 1600, 900), publishedAt: new Date("2026-09-24T16:00:00Z") },
    { slug: "harbor-song", title: "Harbor Song", kind: "music_video" as const, cityId: c.charleston.id, minutes: 5,
      summary: "Charleston's song, filmed on the harbor at sunrise with a church choir.",
      body: "A choir from Charleston joined the music video at the harbor. Harbor Light and Queen of Hearts were drawn from the mornings of this shoot.",
      poster: placeholder("film-harbor-song", "Harbor Song", 195, 1600, 900), publishedAt: new Date("2026-10-18T16:00:00Z") },
    { slug: "why-we-travel", title: "Why We Travel", kind: "mission_story" as const, cityId: null, minutes: 6,
      summary: "One city, one mission, one testimony, one limited art collection.",
      body: "Why the team goes city by city: making music, sharing the Good News, filming what happens, and turning it into art that sends the mission on to the next city.",
      poster: placeholder("film-why-we-travel", "Why We Travel", 10, 1600, 900), publishedAt: new Date("2026-08-30T16:00:00Z") },
    { slug: "painting-the-founders-canvas", title: "Painting the Founders Canvas", kind: "behind_the_scenes" as const, cityId: c.charlotte.id, minutes: 3,
      summary: "Jesse Shane Fisher paints the Charlotte founders canvas live during worship.",
      body: "Behind the scenes of the one-of-one canvas auctioned at Art + Charity: the first sketch, the night it was painted, and the finished piece.",
      poster: placeholder("film-founders-canvas", "Founders Canvas", 305, 1600, 900), publishedAt: new Date("2026-09-16T16:00:00Z") },
  ]).returning();

  console.log(`Seeded ${users.length} users, ${artworks.length} artworks, ${lots.length} lots, ${photos.length} photos, ${films.length} films.`);
}

main().then(() => client.end()).catch(async (err) => { console.error(err); await client.end(); process.exit(1); });
