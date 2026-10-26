import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { ProfileForm } from "./profile-form";

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
      <ProfileForm displayName={user.displayName} tagline={user.tagline ?? ""} />
      <div className="space-y-1 text-sm">
        <p className="text-xs text-muted">Signed in as</p>
        <p>{user.email}</p>
      </div>
      <form action={signOut}><button className={buttonClass("outline", "w-full")}>Sign out</button></form>
    </div>
  );
}
