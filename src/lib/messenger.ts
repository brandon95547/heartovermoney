// The Connections Messenger's rules and reads (design pages 3–4; development overview page 3).
// Guests registered for the next event can message each other until its connections close, a
// day after it starts, when the site moves on to the event after it (as getNextEvent does).
// The red + on a conversation asks to stay connected; once both have asked, the two are a
// Connection. After the close only Connections remain: everyone else is anonymous again, and
// their conversations are gone.
//
// Server-only. These don't call `connection()`: the Messenger's pages read the next event
// first, which does, and Server Actions use them too.
import "server-only";
import { and, asc, desc, eq, gt, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";

export const CONNECTIONS_OPEN_MS = 86_400_000;
export const connectionsCloseAt = (startsAt: Date) => new Date(startsAt.getTime() + CONNECTIONS_OPEN_MS);

// "asked": this guest has tapped the +, the other hasn't yet.
export type ConnectState = "none" | "asked" | "connected";
const stateOf = (mine: boolean, theirs: boolean): ConnectState => (mine && theirs ? "connected" : mine ? "asked" : "none");

// The event whose connections are open now, if any.
export async function openEvent() {
  const [ev] = await db.select({ id: s.events.id, startsAt: s.events.startsAt }).from(s.events)
    .where(gt(s.events.startsAt, new Date(Date.now() - CONNECTIONS_OPEN_MS))).orderBy(asc(s.events.startsAt)).limit(1);
  return ev ?? null;
}

const registered = (eventId: string | null, userId: unknown) =>
  sql<boolean>`exists (select 1 from registrations r where r.event_id = ${eventId} and r.user_id = ${userId})`;
const asked = (from: unknown, to: unknown) =>
  sql<boolean>`exists (select 1 from connections c where c.user_id = ${from} and c.other_id = ${to})`;

// The Messages list: one row per guest, with the latest message either way and how many of
// theirs are unread. Only conversations that still stand: with a Connection, or with a guest
// of the open event.
export async function listConversations(me: string, eventId: string | null) {
  const rows = await db.execute<{
    other_id: string; username: string; display_name: string; body: string; created_at: Date; from_me: boolean;
    unread: number; mine: boolean; theirs: boolean; at_event: boolean;
  }>(sql`
    with latest as (
      select distinct on (other_id) other_id, body, created_at, sender_id from (
        select case when sender_id = ${me} then recipient_id else sender_id end as other_id, body, created_at, sender_id
        from messages where sender_id = ${me} or recipient_id = ${me}
      ) mine order by other_id, created_at desc
    )
    select l.other_id, u.username, u.display_name, l.body, l.created_at, l.sender_id = ${me} as from_me,
      (select count(*)::int from messages m where m.sender_id = l.other_id and m.recipient_id = ${me} and m.read_at is null) as unread,
      ${asked(me, sql`l.other_id`)} as mine, ${asked(sql`l.other_id`, me)} as theirs,
      ${eventId ? registered(eventId, sql`l.other_id`) : sql`false`} as at_event
    from latest l join users u on u.id = l.other_id
    order by l.created_at desc`);
  return rows
    .filter((r) => (r.mine && r.theirs) || r.at_event)
    .map((r) => ({
      username: r.username, displayName: r.display_name, body: r.body, createdAt: new Date(r.created_at),
      fromMe: r.from_me, unread: r.unread, state: stateOf(r.mine, r.theirs), canConnect: r.at_event,
    }));
}
export type Conversation = Awaited<ReturnType<typeof listConversations>>[number];

// The guest list under the chain link (design page 4): everyone else registered for the event
// who chose to be listed (Settings), with where each connection stands.
export async function listGuests(eventId: string, me: string) {
  const rows = await db.select({
    username: s.users.username, displayName: s.users.displayName, tagline: s.users.tagline,
    mine: asked(me, s.users.id), theirs: asked(s.users.id, me),
  }).from(s.registrations).innerJoin(s.users, eq(s.users.id, s.registrations.userId))
    .where(and(eq(s.registrations.eventId, eventId), eq(s.users.listedAsAttendee, true), sql`${s.users.id} <> ${me}`))
    .orderBy(asc(s.registrations.createdAt));
  return rows.map(({ mine, theirs, ...g }) => ({ ...g, state: stateOf(mine, theirs) }));
}

// Who `me` is talking to at /chat/[username], and what they may do: write (a Connection, or
// both at the open event, to a listed guest or one already in a conversation with them) and
// tap the + (both at the open event). Null when the conversation isn't open to them.
export async function getPeer(me: string, username: string) {
  const event = await openEvent();
  const [p] = await db.select({
    id: s.users.id, username: s.users.username, displayName: s.users.displayName, tagline: s.users.tagline,
    listed: s.users.listedAsAttendee, mine: asked(me, s.users.id), theirs: asked(s.users.id, me),
    bothAtEvent: event ? sql<boolean>`${registered(event.id, me)} and ${registered(event.id, s.users.id)}` : sql<boolean>`false`,
    metAt: sql<string | null>`(select c.event_id from connections c where c.user_id = ${me} and c.other_id = ${s.users.id})`,
    talked: sql<boolean>`exists (select 1 from messages m where (m.sender_id = ${me} and m.recipient_id = ${s.users.id}) or (m.sender_id = ${s.users.id} and m.recipient_id = ${me}))`,
  }).from(s.users).where(eq(s.users.username, username)).limit(1);
  if (!p || p.id === me) return null;
  const state = stateOf(p.mine, p.theirs);
  const atEvent = p.bothAtEvent && (p.listed || p.talked);
  if (state !== "connected" && !atEvent) return null;
  return {
    id: p.id, username: p.username, displayName: p.displayName, tagline: p.tagline, state,
    // The event a new message is sent from: the open one, or where a Connection was made.
    canConnect: atEvent, eventId: atEvent ? event!.id : p.metAt!,
  };
}

// The conversation, oldest first: its latest 300 messages.
export async function getThread(me: string, otherId: string) {
  const rows = await db.select({ id: s.messages.id, fromMe: sql<boolean>`${s.messages.senderId} = ${me}`, body: s.messages.body, createdAt: s.messages.createdAt })
    .from(s.messages)
    .where(or(and(eq(s.messages.senderId, me), eq(s.messages.recipientId, otherId)), and(eq(s.messages.senderId, otherId), eq(s.messages.recipientId, me))))
    .orderBy(desc(s.messages.createdAt)).limit(300);
  return rows.reverse();
}
