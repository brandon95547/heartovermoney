import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { PageHeader, SectionLabel, Skeleton, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { PasswordForm, PreferencesForm, ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <main>
      <PageHeader title="Settings" back="/profile" />
      <Suspense fallback={<Skeleton className="m-5 h-64" />}><Settings /></Suspense>
    </main>
  );
}

async function Settings() {
  const user = await requireUser("/settings");
  return (
    <div className="space-y-8 p-5">
      <section className="space-y-4">
        <SectionLabel>Personal information</SectionLabel>
        <ProfileForm displayName={user.displayName} tagline={user.tagline ?? ""} shipAddress={user.shipAddress ?? ""} />
      </section>
      <section className="space-y-4">
        <SectionLabel>Password and security</SectionLabel>
        <PasswordForm />
      </section>
      <section className="space-y-4">
        <PreferencesForm emailUpdates={user.emailUpdates} listedAsAttendee={user.listedAsAttendee} showOnScoreboard={user.showOnScoreboard} />
      </section>
      <section className="space-y-2 text-sm">
        <SectionLabel>Account</SectionLabel>
        <p><span className="text-xs text-muted">Signed in as</span><br />{user.email} · @{user.username}</p>
        <p><Link href="/membership" className="font-semibold underline">Membership</Link> · <Link href="/profile/cards" className="font-semibold underline">My cards</Link> · <Link href="/vault" className="font-semibold underline">Vault</Link></p>
      </section>
      <form action={signOut}><button className={buttonClass("outline", "w-full")}>Sign out</button></form>
    </div>
  );
}
