// Monthly membership (business plan: "Initial Revenue Strategy", "Collector Club"). The 700
// Club starts at $77.70 a month. Test mode: choosing a tier records it without charging.
import type { Metadata } from "next";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { cancelTier, chooseTier } from "@/app/actions/account";
import { PageHeader, SectionLabel, Skeleton, buttonClass } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { money } from "@/lib/format";
import { TIERS } from "@/lib/membership";

export const metadata: Metadata = { title: "Membership" };

export default function MembershipPage() {
  return (
    <main>
      <PageHeader title="Membership" back="/profile" />
      <div className="space-y-6 p-5">
        <div>
          <h2 className="text-2xl font-bold leading-tight">What will happen if we completely give God one year of our lives?</h2>
          <p className="mt-2 text-sm text-muted">Monthly support sends the mission to the next city. Limited artwork, real testimonies, visible Gospel impact.</p>
        </div>
        <Suspense fallback={<Skeleton className="h-96" />}><Tiers /></Suspense>
        <section className="rounded-md bg-fog p-5">
          <SectionLabel className="mb-3">Collector Club</SectionLabel>
          <ul className="space-y-2 text-sm">
            {["Early access to every city drop", "Documentary previews and private livestreams", "First access to artist proofs", "Invitations to selected city experiences"].map((b) => (
              <li key={b} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0" /> {b}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">SuperOptimistic.vip: only 77 seats. Legacy Collector: only 777 seats.</p>
        </section>
      </div>
    </main>
  );
}

async function Tiers() {
  const user = await getUser();
  return (
    <div className="space-y-3">
      {TIERS.map((t) => {
        const current = user?.membershipTier === t.id;
        return (
          <form key={t.id} action={chooseTier}
            className={`flex items-center justify-between rounded-md border p-4 ${t.club ? "border-ink" : "border-line"} ${current ? "bg-ink text-white" : ""}`}>
            <input type="hidden" name="tier" value={t.id} />
            <div>
              <p className="font-bold">{t.name}</p>
              <p className="text-sm">{money(t.cents, { cents: true })} / month{t.club && t.id !== "seven_hundred_club" ? " · 700 Club" : ""}</p>
            </div>
            {current ? <span className="text-xs font-bold uppercase">Your tier</span>
              : <button className={buttonClass(t.club ? "black" : "outline", "h-10 px-4 text-xs")}>{user ? "Choose" : "Sign in"}</button>}
          </form>
        );
      })}
      {user?.membershipTier && <form action={cancelTier}><button className="w-full py-2 text-xs text-muted underline">Cancel membership</button></form>}
      <p className="text-center text-xs text-muted">Test mode: no card is charged.</p>
    </div>
  );
}
