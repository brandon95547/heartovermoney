// Words the team edits in the admin panel (site_content), with the text the site was built with
// as each one's default. Server-only.
import "server-only";
import { connection } from "next/server";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";

export const CONTENT_DEFAULTS = {
  "home.featuredCity": "",
  "home.featuredHeadline": "",
  "home.featuredText": "",
  "mission.intro": [
    "We travel city by city making music, sharing the Gospel, filming what happens, and turning those experiences into highly limited collectible artwork.",
    "Collectors own numbered pieces connected to real people, real cities and real moments, and that revenue helps send the mission to the next city. Every collection exists for a reason: a city visited, a song, a music video, a group of people, a mission and a story of faith. The city becomes part of the artwork's history.",
  ].join("\n\n"),
  "about.intro": [
    "A Christian art and media company: an art house and a movement that travels city by city. Musicians, filmmakers and artists go on each campaign together; what happens there becomes a song, a film and a limited collection.",
    "We're not building another merchandise company. We're building a collectible visual history of a Christian movement across America, financed by the people who collect it.",
  ].join("\n\n"),
} as const;

export type ContentKey = keyof typeof CONTENT_DEFAULTS;

export async function getContent<K extends ContentKey>(keys: K[]): Promise<Record<K, string>> {
  await connection();
  const rows = await db.select().from(schema.siteContent).where(inArray(schema.siteContent.key, keys));
  const out = {} as Record<K, string>;
  for (const k of keys) out[k] = rows.find((r) => r.key === k)?.value ?? CONTENT_DEFAULTS[k];
  return out;
}

// Paragraphs separated by a blank line.
export const paragraphs = (v: string) => v.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
