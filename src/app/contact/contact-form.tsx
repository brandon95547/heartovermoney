"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sendContactMessage, type ContactState } from "@/app/actions/contact";
import { Field, buttonClass } from "@/components/ui";

export function ContactForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, undefined);
  if (state?.sent) {
    return (
      <div role="status" className="space-y-4 rounded-md bg-fog p-5 text-center">
        <p className="font-semibold">Thank you. Your message is on its way.</p>
        <p className="text-sm text-muted">We&apos;ll reply to the email you gave.</p>
        <Link href="/" className={buttonClass("outline", "w-full")}>Back to the collections</Link>
      </div>
    );
  }
  const f = state?.fields ?? {};
  return (
    <form action={action} className="space-y-4">
      <Field label="Your name" name="name" autoComplete="name" required defaultValue={f.name ?? name} />
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={f.email ?? email} />
      <label className="block">
        <span className="sr-only">Message</span>
        <textarea name="message" rows={6} required minLength={10} maxLength={4000} defaultValue={f.message} placeholder="Your message"
          className="w-full rounded-md bg-fog p-5 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/20" />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {state?.error && <p role="alert" className="text-sm text-alert">{state.error}</p>}
      <button disabled={pending} className={buttonClass("black", "w-full")}>{pending ? "Sending…" : "Send"}</button>
    </form>
  );
}
