import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { PageHeader, SectionLabel, Skeleton, buttonClass } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { money } from "@/lib/format";
import { FINE_ART_KINDS, isSuperOptimistic, tierById } from "@/lib/membership";
import { listOrders, listVault } from "@/lib/queries";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <main>
      <PageHeader title="Profile" />
      <Suspense fallback={<Skeleton className="m-5 h-80" />}><Profile /></Suspense>
    </main>
  );
}

async function Profile() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-6 px-8 py-16 text-center">
        <Logo size={64} />
        <p className="text-sm text-muted">Sign in to see your collection, orders and membership.</p>
        <Link href="/signin?next=/profile" className={buttonClass("black", "w-full")}>Sign in</Link>
        <Link href="/signup?next=/profile" className={buttonClass("outline", "w-full")}>Create account</Link>
      </div>
    );
  }
  const tier = tierById(user.membershipTier);
  const [orders, vault] = await Promise.all([listOrders(user.id), listVault(user.id)]);
  const superOptimistic = isSuperOptimistic(user.membershipTier, vault.filter((p) => FINE_ART_KINDS.includes(p.kind)).length);
  const link = (href: string, label: string, detail?: string) => (
    <Link href={href} className="flex items-center justify-between py-4 text-sm">
      <span>{label}</span><span className="flex items-center gap-2 text-muted">{detail}<ChevronRight className="size-4" /></span>
    </Link>
  );
  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-ink text-xl font-bold text-white">{user.displayName[0]}</span>
        <div>
          <p className="text-lg font-semibold">{user.displayName}</p>
          <p className="text-sm text-muted">@{user.username}{user.tagline ? ` · ${user.tagline}` : ""}</p>
          {user.isVip && (
            <span className="mt-1 inline-block rounded bg-vip px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              {superOptimistic ? "Super Optimistic VIP" : "VIP"}
            </span>
          )}
        </div>
      </div>
      <nav className="divide-y divide-line border-y border-line">
        {link("/vault", "Vault", "Your collection")}
        {link("/membership", "Membership", tier ? tier.name : "Join")}
        {link("/events", "The next event")}
        {link("/settings", "Settings")}
      </nav>
      <section>
        <SectionLabel className="mb-2">Orders</SectionLabel>
        {orders.length ? (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex justify-between py-3 text-sm">
                  <span className="capitalize">{o.kind === "lot" ? "Auction lot" : o.kind} · {o.createdAt.toLocaleDateString("en-US", { timeZone: "America/New_York" })}</span>
                  <span className="font-semibold">{money(o.totalCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No orders yet.</p>}
      </section>
      <form action={signOut}><button className={buttonClass("outline", "w-full")}>Sign out</button></form>
    </div>
  );
}
