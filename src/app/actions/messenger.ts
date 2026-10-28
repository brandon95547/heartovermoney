"use server";

// Connections Messenger actions: send a message, tap the red + to connect, and mark a
// conversation read. Who may do what is decided in lib/messenger (getPeer).
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { getUser } from "@/lib/dal";
import { getPeer } from "@/lib/messenger";

export type MessageState = { error?: string; sent?: number } | undefined;

const Message = z.object({
  to: z.string().min(1).max(40),
  body: z.string().trim().min(1, "Write a message first.").max(2000, "Keep it under 2,000 characters."),
});

export async function sendMessage(_: MessageState, form: FormData): Promise<MessageState> {
  const user = await getUser();
  if (!user) return { error: "Sign in to send messages." };
  const parsed = Message.safeParse({ to: form.get("to"), body: form.get("body") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const peer = await getPeer(user.id, parsed.data.to);
  if (!peer) return { error: "This conversation has closed." };
  await db.insert(s.messages).values({ eventId: peer.eventId, senderId: user.id, recipientId: peer.id, body: parsed.data.body });
  revalidatePath(`/chat/${peer.username}`);
  return { sent: Date.now() };
}

export async function connectWith(username: string) {
  const user = await getUser();
  if (!user) return;
  const peer = await getPeer(user.id, username);
  if (!peer?.canConnect || peer.state !== "none") return;
  await db.insert(s.connections).values({ userId: user.id, otherId: peer.id, eventId: peer.eventId }).onConflictDoNothing();
  revalidatePath("/chat");
  revalidatePath(`/chat/${peer.username}`);
}

export async function markRead(username: string) {
  const user = await getUser();
  if (!user) return;
  const [other] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.username, username)).limit(1);
  if (!other) return;
  await db.update(s.messages).set({ readAt: new Date() })
    .where(and(eq(s.messages.senderId, other.id), eq(s.messages.recipientId, user.id), isNull(s.messages.readAt)));
}
