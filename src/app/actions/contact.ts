"use server";

// The Contact form: kept in contact_messages, and emailed to CONTACT_EMAIL when mail is set up.
import { z } from "zod";
import { db, schema } from "@/db";
import { getUser } from "@/lib/dal";
import { sendMail } from "@/lib/mail";

export type ContactState = { error?: string; sent?: boolean; fields?: Record<string, string> } | undefined;

const Message = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.email("Enter a valid email address.").max(200),
  message: z.string().trim().min(10, "Write a little more, so we can help.").max(4000),
});

export async function sendContactMessage(_: ContactState, form: FormData): Promise<ContactState> {
  const fields = Object.fromEntries(["name", "email", "message"].map((k) => [k, String(form.get(k) ?? "")]));
  // A field people can't see: filled in only by bots, whose messages are dropped quietly.
  if (form.get("website")) return { sent: true };
  const parsed = Message.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const user = await getUser();
  await db.insert(schema.contactMessages).values({ ...parsed.data, userId: user?.id ?? null });
  const to = process.env.CONTACT_EMAIL;
  if (to) {
    await sendMail({ to, replyTo: parsed.data.email, subject: `Contact form: ${parsed.data.name}`, text: `${parsed.data.message}\n\n${parsed.data.name} <${parsed.data.email}>` });
  }
  return { sent: true };
}
