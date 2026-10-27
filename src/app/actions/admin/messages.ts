"use server";

// Contact messages: marking one handled (or back to open).
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema as s } from "@/db";
import { adminActor } from "@/lib/admin";

export async function toggleMessageHandled(form: FormData) {
  await adminActor();
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const [m] = await db.select({ handledAt: s.contactMessages.handledAt }).from(s.contactMessages).where(eq(s.contactMessages.id, id)).limit(1);
  if (!m) return;
  await db.update(s.contactMessages).set({ handledAt: m.handledAt ? null : new Date() }).where(eq(s.contactMessages.id, id));
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}
