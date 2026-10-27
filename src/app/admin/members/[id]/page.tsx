// One member: what they've collected and bought, and the changes an admin can make by hand.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { emailResetLink, setRole, setTier } from "@/app/actions/admin/members";
import { AdminForm } from "@/components/admin-form";
import { AdminTitle, Pill, Section, SelectField, Stat, TextField, adminLink } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/admin-forms";
import { getMember } from "@/lib/admin-queries";
import { money } from "@/lib/format";
import { TIERS, isSuperOptimistic, isVipMember } from "@/lib/membership";

export const metadata: Metadata = { title: "Member" };

export default function MemberPage(props: PageProps<"/admin/members/[id]">) {
  return (
    <main className="p-5">
      <AdminTitle title="Member" back={{ href: "/admin/members", label: "Members" }} />
      <Suspense fallback={<Skeleton className="h-96" />}><Member params={props.params} /></Suspense>
    </main>
  );
}

async function Member({ params }: { params: PageProps<"/admin/members/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/members/${id}`);
  const found = isUuid(id) ? await getMember(id) : null;
  if (!found) notFound();
  const { user: u } = found;
  return (
    <div className="space-y-8">
      <div className="space-y-1 text-sm">
        <p className="text-lg font-bold">{u.displayName}</p>
        <p>@{u.username} · <a href={`mailto:${u.email}`} className="underline">{u.email}</a></p>
        {u.tagline && <p className="text-muted">{u.tagline}</p>}
        <p className="flex flex-wrap gap-1 pt-1">
          <Pill tone={u.role === "admin" ? "ink" : "neutral"}>{u.role}</Pill>
          {isVipMember(u.role, u.membershipTier) && <Pill tone="vip">VIP</Pill>}
          {isSuperOptimistic(u.membershipTier, found.finePieces) && <Pill tone="go">Super Optimistic</Pill>}
        </p>
        <p className="text-xs text-muted">Joined {u.createdAt.toLocaleDateString("en-US", { timeZone: "America/New_York" })}{u.membershipSince ? ` · member since ${u.membershipSince.toLocaleDateString("en-US", { timeZone: "America/New_York" })}` : ""}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Orders" value={found.orders} href={`/admin/orders`} />
        <Stat label="Spent" value={money(found.spent)} />
        <Stat label="Pieces owned" value={found.pieces} href={`/admin/editions?q=${encodeURIComponent(u.username)}`} />
      </div>
      <p className="text-sm">{found.cards} collector card{found.cards === 1 ? "" : "s"} registered. <Link href="/admin/cards" className={adminLink}>Cards</Link></p>
      <Section title="Membership">
        <AdminForm action={setTier} submit="Save the membership">
          <input type="hidden" name="id" value={u.id} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Membership" name="tier" defaultValue={u.membershipTier ?? ""} options={[["", "None"], ...TIERS.map((t) => [t.id, `${t.name} · ${money(t.cents)}/mo`] as const)]} />
            <TextField label="Why" name="reason" required maxLength={300} placeholder="e.g. complimentary for the artist" />
          </div>
          <p className="text-xs text-muted">Test mode: memberships aren&apos;t charged yet. Changes made here are recorded with your reason.</p>
        </AdminForm>
      </Section>
      <Section title="Role">
        <AdminForm action={setRole} submit="Save the role" variant="outline">
          <input type="hidden" name="id" value={u.id} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Role" name="role" defaultValue={u.role} options={[["member", "Member"], ["vip", "VIP without a membership"], ["admin", "Admin"]]} />
            <TextField label="Why" name="reason" required maxLength={300} />
          </div>
        </AdminForm>
      </Section>
      <Section title="Password">
        <AdminForm action={emailResetLink} submit="Email a reset link" variant="outline">
          <input type="hidden" name="id" value={u.id} />
          <p className="text-xs text-muted">Sends {u.email} a link to set a new password, good once for an hour.</p>
        </AdminForm>
      </Section>
    </div>
  );
}
