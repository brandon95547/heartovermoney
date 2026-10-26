// Where a printed card sends people: the onboarding tour.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getUser } from "@/lib/dal";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Welcome" };

export default function StartPage() {
  return (
    <main className="chevrons fixed inset-0 z-50 mx-auto flex max-w-md flex-col text-white md:max-w-2xl">
      <div className="flex justify-end p-4"><Link href="/" className="text-sm">Skip</Link></div>
      <Suspense fallback={<div className="flex-1" />}><Tour /></Suspense>
    </main>
  );
}

async function Tour() {
  const user = await getUser();
  return <Onboarding signedIn={!!user} />;
}
