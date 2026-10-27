"use client";

import { useActionState } from "react";
import { changePassword, updateProfile } from "@/app/actions/account";
import { buttonClass } from "@/components/ui";

const input = "h-12 w-full rounded-md bg-fog px-4 text-sm outline-none focus:ring-2 focus:ring-ink/20";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wider text-muted";

function Result({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (state?.error) return <p role="alert" className="text-sm text-alert">{state.error}</p>;
  if (state?.ok) return <p role="status" className="text-sm text-go">{state.ok}</p>;
  return null;
}

export function ProfileForm({ displayName, tagline, shipAddress, emailUpdates }: {
  displayName: string; tagline: string; shipAddress: string; emailUpdates: boolean;
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block"><span className={label}>Name</span>
        <input name="displayName" defaultValue={displayName} required maxLength={60} className={input} /></label>
      <label className="block"><span className={label}>About you</span>
        <input name="tagline" defaultValue={tagline} maxLength={80} placeholder="e.g. joyful enthusiast" className={input} /></label>
      <label className="block"><span className={label}>Shipping address</span>
        <textarea name="shipAddress" defaultValue={shipAddress} rows={3} maxLength={300} placeholder="Used when you have art or a card shipped"
          className="w-full rounded-md bg-fog p-4 text-sm outline-none focus:ring-2 focus:ring-ink/20" /></label>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="emailUpdates" defaultChecked={emailUpdates} className="size-5 accent-ink" />
        Email me about new drops and events
      </label>
      <Result state={state} />
      <button disabled={pending} className={buttonClass("black", "w-full")}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block"><span className={label}>Current password</span>
        <input name="current" type="password" autoComplete="current-password" required className={input} /></label>
      <label className="block"><span className={label}>New password</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={8} className={input} /></label>
      <Result state={state} />
      <button disabled={pending} className={buttonClass("outline", "w-full")}>{pending ? "Changing…" : "Change password"}</button>
    </form>
  );
}
