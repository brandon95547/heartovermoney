"use server";

// Content: films and stories, the home page's current drop, and the Mission and About text.
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema as s } from "@/db";
import type { AdminState } from "@/components/admin-form";
import { AdminError, adminActor, audit, slugify } from "@/lib/admin";
import { isUuid, text, url, whole } from "@/lib/admin-forms";
import { attempt, refreshSite, savePictures } from "@/lib/admin-run";
import { CONTENT_DEFAULTS, type ContentKey } from "@/lib/content";
import { fromEasternInput } from "@/lib/eastern";

const KINDS = ["music_video", "city_film", "mission_story", "behind_the_scenes"] as const;

export async function saveFilm(_: AdminState, form: FormData): Promise<AdminState> {
  let createdId: string | null = null;
  const result = await attempt(async () => {
    const admin = await adminActor();
    const title = text(form, "title", 120);
    const kind = KINDS.find((k) => k === form.get("kind"));
    const summary = text(form, "summary", 300);
    const body = text(form, "body", 8000);
    if (!title || !kind || !summary || !body) throw new AdminError("Fill in the title, kind, summary and story.");
    const videoUrl = url(form, "videoUrl");
    if (text(form, "videoUrl") && !videoUrl) throw new AdminError("The video address must start with https://.");
    const cityId = form.get("cityId");
    const [poster] = await savePictures(form, "poster");
    const fields = {
      title, kind, summary, body, videoUrl, slug: slugify(text(form, "slug", 60) ?? title),
      cityId: isUuid(cityId) ? cityId : null, minutes: whole(form, "minutes", 1),
      publishedAt: fromEasternInput(form.get("publishedAt")) ?? new Date(), ...(poster ? { poster } : {}),
    };
    const id = form.get("id");
    if (isUuid(id)) {
      await db.update(s.films).set(fields).where(eq(s.films.id, id));
      await audit(admin.id, "edited the film", title);
      refreshSite();
      return { ok: "Saved." };
    }
    if (!poster) throw new AdminError("Add the poster picture.");
    const [row] = await db.insert(s.films).values({ ...fields, poster }).returning({ id: s.films.id });
    await audit(admin.id, "added the film", title);
    refreshSite();
    createdId = row.id;
    return { ok: "Added." };
  });
  if (createdId) redirect(`/admin/content/films/${createdId}`);
  return result;
}

export async function deleteFilm(_: AdminState, form: FormData): Promise<AdminState> {
  const result = await attempt(async () => {
    const admin = await adminActor();
    const id = form.get("id");
    if (!isUuid(id)) throw new AdminError("That film no longer exists.");
    const [film] = await db.delete(s.films).where(eq(s.films.id, id)).returning({ title: s.films.title });
    await audit(admin.id, "deleted the film", film?.title ?? id);
    refreshSite();
    return { ok: "Deleted." };
  });
  if (result?.ok) redirect("/admin/content");
  return result;
}

// Saves the fields of one content form (each field named for its key). An empty field goes
// back to the site's own text.
export async function saveContent(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const keys = (Object.keys(CONTENT_DEFAULTS) as ContentKey[]).filter((k) => form.has(k));
    if (!keys.length) throw new AdminError("Nothing to save.");
    for (const key of keys) {
      const value = String(form.get(key) ?? "").trim().slice(0, 8000);
      if (!value) await db.delete(s.siteContent).where(eq(s.siteContent.key, key));
      else await db.insert(s.siteContent).values({ key, value }).onConflictDoUpdate({ target: s.siteContent.key, set: { value, updatedAt: new Date() } });
    }
    await audit(admin.id, "edited the words of", keys.map((k) => k.split(".")[0]).filter((v, i, a) => a.indexOf(v) === i).join(", "));
    refreshSite();
    return { ok: "Saved." };
  });
}
