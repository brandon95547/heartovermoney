// Every numbered piece issued, its owner and status; record a sale made in person.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { issueEdition } from "@/app/actions/admin/editions";
import { AdminForm } from "@/components/admin-form";
import { AdminTitle, MoneyField, Pill, Section, SelectField, TextField } from "@/components/admin-ui";
import { ArtImage } from "@/components/art-image";
import { Empty, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/admin-forms";
import { listAdminArtworks, listAdminEditions, listEventsBrief } from "@/lib/admin-queries";

export const metadata: Metadata = { title: "Editions" };

export default function EditionsPage(props: PageProps<"/admin/editions">) {
  return (
    <main className="p-5">
      <AdminTitle title="Editions" />
      <Suspense fallback={<Skeleton className="h-96" />}><Editions searchParams={props.searchParams} /></Suspense>
    </main>
  );
}

const STATUS = { active: ["go", "Active"], void: ["alert", "Void"], damaged: ["alert", "Damaged"] } as const;

async function Editions({ searchParams }: { searchParams: PageProps<"/admin/editions">["searchParams"] }) {
  await requireAdmin("/admin/editions");
  const sp = await searchParams;
  const pieceId = isUuid(sp.piece) ? sp.piece : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const [editions, pieces, events] = await Promise.all([listAdminEditions({ pieceId, q }), listAdminArtworks(), listEventsBrief()]);
  const open = pieces.filter((p) => p.issued < p.editionSize);
  return (
    <div className="space-y-8">
      <form action="/admin/editions" className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Piece" name="piece" defaultValue={pieceId ?? ""} options={[["", "All pieces"], ...pieces.map((p) => [p.id, p.title] as const)]} />
          <TextField label="Code or owner" name="q" defaultValue={q} placeholder="e.g. HARBOR or @name" />
        </div>
        <button className="self-end rounded-full bg-ink px-4 py-3 text-xs font-bold text-white">Show</button>
      </form>
      <Section title={`Numbered pieces (${editions.length})`}>
        {editions.length ? (
          <ul className="divide-y divide-line">
            {editions.map((e) => (
              <li key={e.id}>
                <Link href={`/admin/editions/${e.id}`} className="flex gap-3 py-3 text-sm">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-mist"><ArtImage src={e.images[0]} alt="" sizes="48px" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{e.title} · No. {e.number} of {e.editionSize}</span>
                    <span className="block truncate font-mono text-[11px] text-muted">{e.code}</span>
                    <span className="mt-1 flex gap-2 text-xs"><span>{e.owner ? `@${e.owner}` : "No owner"}</span><Pill tone={STATUS[e.status][0]}>{STATUS[e.status][1]}</Pill></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <Empty>No numbered pieces match.</Empty>}
      </Section>
      <Section title="Record a sale made in person">
        <p className="text-sm text-muted">For a piece sold at the door or by the team: it takes the next number, gets its certificate and ownership record, and the sale is counted on the event&apos;s scoreboard.</p>
        <AdminForm action={issueEdition} submit="Issue the next number">
          <SelectField label="Piece" name="pieceId" required defaultValue={pieceId} options={open.map((p) => [p.id, `${p.title} (${p.editionSize - p.issued} left)`] as const)} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Collector's username" name="owner" required placeholder="@username" />
            <MoneyField label="Price paid" name="price" hint="The piece's price if empty" />
          </div>
          <SelectField label="Sold at" name="eventId" options={[["", "Not at an event"], ...events.map((e) => [e.id, `${e.title} · ${e.cityName}`] as const)]} />
          <TextField label="Note" name="note" maxLength={300} placeholder="e.g. paid by card at the merch table" />
        </AdminForm>
      </Section>
    </div>
  );
}
