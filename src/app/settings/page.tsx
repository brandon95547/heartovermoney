import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { PageHeader, SectionLabel, Skeleton, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { PasswordForm, ProfileForm } from "./profile-form";

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
        <SectionLabel>Profile</SectionLabel>
        <ProfileForm displayName={user.displayName} tagline={user.tagline ?? ""} shipAddress={user.shipAddress ?? ""} emailUpdates={user.emailUpdates} />
      </section>
      <section className="space-y-4">
        <SectionLabel>Password</SectionLabel>
        <PasswordForm />
      </section>
      <div className="space-y-1 text-sm">
        <p className="text-xs text-muted">Signed in as</p>
        <p>{user.email}</p>
      </div>
      <form action={signOut}><button className={buttonClass("outline", "w-full")}>Sign out</button></form>
    </div>
  );
}
