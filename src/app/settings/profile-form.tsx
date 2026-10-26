"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/account";
import { buttonClass } from "@/components/ui";

export function ProfileForm({ displayName, tagline }: { displayName: string; tagline: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const input = "h-12 w-full rounded-md bg-fog px-4 text-sm outline-none focus:ring-2 focus:ring-ink/20";
  return (
    <form action={action} className="space-y-4">
      <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Name</span>
        <input name="displayName" defaultValue={displayName} required maxLength={60} className={input} /></label>
      <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">About you</span>
        <input name="tagline" defaultValue={tagline} maxLength={80} placeholder="e.g. joyful enthusiast" className={input} /></label>
      {state?.error && <p role="alert" className="text-sm text-alert">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-go">{state.ok}</p>}
      <button disabled={pending} className={buttonClass("black", "w-full")}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
