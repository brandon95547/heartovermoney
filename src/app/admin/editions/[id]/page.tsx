// One numbered piece: its certificate, owner, status and ownership record, and the changes an
// admin can make (move it to a new owner, retire it, restore it).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { setEditionStatus, transferEdition } from "@/app/actions/admin/editions";
import { AdminForm } from "@/components/admin-form";
import { AdminTitle, Pill, Section, SelectField, TextField, adminLink } from "@/components/admin-ui";
import { ArtImage } from "@/components/art-image";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/admin-forms";
import { getAdminEdition } from "@/lib/admin-queries";
import { certificatePath } from "@/lib/certificates";

export const metadata: Metadata = { title: "Numbered piece" };

export default function EditionPage(props: PageProps<"/admin/editions/[id]">) {
  return (
    <main className="p-5">
      <AdminTitle title="Numbered piece" back={{ href: "/admin/editions", label: "Editions" }} />
      <Suspense fallback={<Skeleton className="h-96" />}><Edition params={props.params} /></Suspense>
    </main>
  );
}

const date = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

async function Edition({ params }: { params: PageProps<"/admin/editions/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/editions/${id}`);
  const e = isUuid(id) ? await getAdminEdition(id) : null;
  if (!e) notFound();
  return (
    <div className="space-y-8">
      <div className="flex gap-4">
        <span className="relative size-24 shrink-0 overflow-hidden rounded-sm bg-mist"><ArtImage src={e.images[0]} alt="" sizes="96px" /></span>
        <div className="min-w-0 space-y-1 text-sm">
          <p className="text-lg font-bold">{e.title}</p>
          <p>No. {e.number} of {e.editionSize}</p>
          <p className="break-all font-mono text-[11px] text-muted">{e.code}</p>
          <p>{e.owner ? <>Owned by <b>{e.ownerName}</b> (@{e.owner})</> : "No owner"}</p>
          <Pill tone={e.status === "active" ? "go" : "alert"}>{e.status === "active" ? "Active" : e.status === "void" ? "Void" : "Damaged"}</Pill>
          {e.statusNote && <p className="text-xs text-muted">{e.statusNote}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <Link href={certificatePath(e.code)} className={adminLink}>Certificate</Link>
        <Link href={`/admin/art/pieces/${e.artworkId}`} className={adminLink}>The piece</Link>
        {e.orderId && <Link href={`/admin/orders/${e.orderId}`} className={adminLink}>Its order</Link>}
      </div>
      <Section title="Ownership record">
        <ol className="space-y-2 text-sm">
          {e.history.map((h) => (
            <li key={h.id} className="flex justify-between gap-3">
              <span>{h.kind === "issued" ? <>Issued to <b>@{h.to}</b></> : <>Moved from @{h.from} to <b>@{h.to}</b></>}</span>
              <span className="text-xs text-muted">{date(h.at)}</span>
            </li>
          ))}
        </ol>
      </Section>
      {e.status === "active" && (
        <Section title="Move to a new owner">
          <AdminForm action={transferEdition} submit="Move it">
            <input type="hidden" name="id" value={e.id} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="New owner's username" name="to" required placeholder="@username" />
              <TextField label="Why" name="reason" required maxLength={300} placeholder="e.g. resold, a gift" />
            </div>
          </AdminForm>
        </Section>
      )}
      <Section title="Status">
        <AdminForm action={setEditionStatus} submit="Save the status" variant="outline"
          confirmText="Retiring a piece takes its certificate out of good standing. Its number is never reused. Go on?">
          <input type="hidden" name="id" value={e.id} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Status" name="status" defaultValue={e.status} options={[["active", "Active"], ["void", "Void (refunded, lost)"], ["damaged", "Damaged"]]} />
            <TextField label="Why" name="note" maxLength={300} defaultValue={e.statusNote ?? ""} />
          </div>
        </AdminForm>
      </Section>
    </div>
  );
}
