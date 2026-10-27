"use server";

// The admin panel's art: pieces (with their edition size, price, release and pictures), artists
// and collections (each city's story). Every change is written to the audit log.
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema as s } from "@/db";
import type { AdminState } from "@/components/admin-form";
import { AdminError, adminActor, audit, slugify } from "@/lib/admin";
import { cents, isUuid, text, url, whole } from "@/lib/admin-forms";
import { attempt, refreshSite, savePictures } from "@/lib/admin-run";
import { fromEasternInput } from "@/lib/eastern";

const KINDS = ["merch", "shoes", "print", "founders_art"] as const;

export async function saveArtwork(_: AdminState, form: FormData): Promise<AdminState> {
  let createdId: string | null = null;
  const result = await attempt(async () => {
    const admin = await adminActor();
    const id = form.get("id");
    const title = text(form, "title", 120);
    const description = text(form, "description", 4000);
    const prefix = text(form, "certificatePrefix", 8)?.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const kind = KINDS.find((k) => k === form.get("kind"));
    const priceCents = cents(form, "price");
    const editionSize = whole(form, "editionSize", 1);
    const artistId = form.get("artistId");
    const cityId = form.get("cityId");
    if (!title || !description || !prefix || !kind || priceCents == null || !editionSize || !isUuid(artistId) || !isUuid(cityId)) {
      throw new AdminError("Fill in the title, artist, collection, kind, price, edition size, certificate code and description.");
    }
    const slug = slugify(text(form, "slug", 60) ?? title);
    const releasesAt = fromEasternInput(form.get("releasesAt"));
    const added = await savePictures(form);
    const remove = new Set(form.getAll("removeImage").map(String));

    if (isUuid(id)) {
      const [current] = await db.select({ images: s.artworks.images }).from(s.artworks).where(eq(s.artworks.id, id)).limit(1);
      if (!current) throw new AdminError("That piece no longer exists.");
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.editions).where(eq(s.editions.artworkId, id));
      if (editionSize < n) throw new AdminError(`${n} numbered pieces are already issued, so the edition can't be smaller than ${n}.`);
      const images = [...current.images.filter((i) => !remove.has(i)), ...added];
      if (!images.length) throw new AdminError("Keep at least one picture.");
      await db.update(s.artworks).set({ title, slug, description, certificatePrefix: prefix, kind, priceCents, editionSize, artistId, cityId, releasesAt, images })
        .where(eq(s.artworks.id, id));
      await audit(admin.id, "edited the piece", title);
      refreshSite();
      return { ok: "Saved." };
    }
    if (!added.length) throw new AdminError("Add at least one picture.");
    const [row] = await db.insert(s.artworks).values({ title, slug, description, certificatePrefix: prefix, kind, priceCents, editionSize, artistId, cityId, releasesAt, images: added })
      .returning({ id: s.artworks.id });
    await audit(admin.id, "added the piece", title, `${editionSize} in the edition`);
    refreshSite();
    createdId = row.id;
    return { ok: "Added." };
  });
  if (createdId) redirect(`/admin/art/pieces/${createdId}`);
  return result;
}

// Only a piece no one has bought can be deleted; after that its numbers are part of the record.
export async function deleteArtwork(_: AdminState, form: FormData): Promise<AdminState> {
  const result = await attempt(async () => {
    const admin = await adminActor();
    const id = form.get("id");
    if (!isUuid(id)) throw new AdminError("That piece no longer exists.");
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.orderItems).where(eq(s.orderItems.artworkId, id));
    const [{ e }] = await db.select({ e: sql<number>`count(*)::int` }).from(s.editions).where(eq(s.editions.artworkId, id));
    if (n || e) throw new AdminError("This piece has been sold, so it stays on record. Set its edition size to the number sold to close it.");
    const [piece] = await db.select({ title: s.artworks.title }).from(s.artworks).where(eq(s.artworks.id, id)).limit(1);
    await db.delete(s.cartItems).where(eq(s.cartItems.artworkId, id));
    await db.delete(s.artworks).where(eq(s.artworks.id, id));
    await audit(admin.id, "deleted the piece", piece?.title ?? id);
    refreshSite();
    return { ok: "Deleted." };
  });
  if (result?.ok) redirect("/admin/art");
  return result;
}

export async function saveArtist(_: AdminState, form: FormData): Promise<AdminState> {
  let createdId: string | null = null;
  const result = await attempt(async () => {
    const admin = await adminActor();
    const name = text(form, "name", 80);
    if (!name) throw new AdminError("Enter the artist's name.");
    const slug = slugify(text(form, "slug", 60) ?? name);
    const bio = text(form, "bio", 2000);
    const id = form.get("id");
    if (isUuid(id)) {
      await db.update(s.artists).set({ name, slug, bio }).where(eq(s.artists.id, id));
      await audit(admin.id, "edited the artist", name);
      refreshSite();
      return { ok: "Saved." };
    }
    const [row] = await db.insert(s.artists).values({ name, slug, bio }).returning({ id: s.artists.id });
    await audit(admin.id, "added the artist", name);
    refreshSite();
    createdId = row.id;
    return { ok: "Added." };
  });
  if (createdId) redirect(`/admin/art/artists/${createdId}`);
  return result;
}

export async function saveCity(_: AdminState, form: FormData): Promise<AdminState> {
  let createdId: string | null = null;
  const result = await attempt(async () => {
    const admin = await adminActor();
    const name = text(form, "name", 80);
    const state = text(form, "state", 2)?.toUpperCase();
    const story = text(form, "story", 6000);
    if (!name || !state || !story) throw new AdminError("Fill in the city, its state and its story.");
    const slug = slugify(text(form, "slug", 60) ?? name);
    const visitedOn = fromEasternInput(form.get("visitedOn"));
    const songTitle = text(form, "songTitle", 120);
    const videoUrl = url(form, "videoUrl");
    if (text(form, "videoUrl") && !videoUrl) throw new AdminError("The video address must start with https://.");
    const [hero] = await savePictures(form, "hero");
    const id = form.get("id");
    const fields = { name, state, slug, story, visitedOn, songTitle, videoUrl, ...(hero ? { heroImage: hero } : {}) };
    if (isUuid(id)) {
      await db.update(s.cities).set(fields).where(eq(s.cities.id, id));
      await audit(admin.id, "edited the collection", `${name}, ${state}`);
      refreshSite();
      return { ok: "Saved." };
    }
    if (!hero) throw new AdminError("Add the collection's cover picture.");
    const [row] = await db.insert(s.cities).values({ ...fields, heroImage: hero }).returning({ id: s.cities.id });
    await audit(admin.id, "added the collection", `${name}, ${state}`);
    refreshSite();
    createdId = row.id;
    return { ok: "Added." };
  });
  if (createdId) redirect(`/admin/art/collections/${createdId}`);
  return result;
}
