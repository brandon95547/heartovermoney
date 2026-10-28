"use client";

import { useActionState } from "react";
import { changePassword, updatePreferences, updateProfile } from "@/app/actions/account";
import { buttonClass } from "@/components/ui";

const input = "h-12 w-full rounded-md bg-fog px-4 text-sm outline-none focus:ring-2 focus:ring-ink/20";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wider text-muted";

function Result({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (state?.error) return <p role="alert" className="text-sm text-alert">{state.error}</p>;
  if (state?.ok) return <p role="status" className="text-sm text-go">{state.ok}</p>;
  return null;
}

export function ProfileForm({ displayName, tagline, shipAddress }: { displayName: string; tagline: string; shipAddress: string }) {
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
      <Result state={state} />
      <button disabled={pending} className={buttonClass("black", "w-full")}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}

function Toggle({ name, label, hint, checked }: { name: string; label: string; hint: string; checked: boolean }) {
  return (
    <label className="flex gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5 size-5 shrink-0 accent-ink" />
      <span><span className="block font-semibold">{label}</span><span className="block text-xs text-muted">{hint}</span></span>
    </label>
  );
}

// Notifications and privacy, saved together.
export function PreferencesForm({ emailUpdates, listedAsAttendee, showOnScoreboard }: { emailUpdates: boolean; listedAsAttendee: boolean; showOnScoreboard: boolean }) {
  const [state, action, pending] = useActionState(updatePreferences, undefined);
  return (
    <form action={action} className="space-y-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-charcoal">Notifications</p>
      <Toggle name="emailUpdates" label="Email me about new drops and events" hint="City drops, VIP early access and the next event." checked={emailUpdates} />
      <p className="pt-2 text-xs font-bold uppercase tracking-[0.14em] text-charcoal">Privacy</p>
      <Toggle name="listedAsAttendee" label="Show me in the attendee list" hint="Other guests at an event you register for can see your name and the line about you in the Connections Messenger." checked={listedAsAttendee} />
      <Toggle name="showOnScoreboard" label="Show my name on Tonight's Scoreboard" hint="When off, your purchases show as @######## to everyone." checked={showOnScoreboard} />
      <Result state={state} />
      <button disabled={pending} className={buttonClass("outline", "w-full")}>{pending ? "Saving…" : "Save preferences"}</button>
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
