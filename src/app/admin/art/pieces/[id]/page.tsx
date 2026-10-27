import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deleteArtwork } from "@/app/actions/admin/art";
import { AdminForm } from "@/components/admin-form";
import { AdminTitle, Section, adminLink } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { getAdminArtwork, listAllArtists, listAllCities } from "@/lib/admin-queries";
import { isUuid } from "@/lib/admin-forms";
import { PieceForm } from "../piece-form";

export const metadata: Metadata = { title: "Piece" };

export default function PiecePage(props: PageProps<"/admin/art/pieces/[id]">) {
  return (
    <main className="p-5">
      <AdminTitle title="Piece" back={{ href: "/admin/art", label: "Art" }} />
      <Suspense fallback={<Skeleton className="h-96" />}><Piece params={props.params} /></Suspense>
    </main>
  );
}

async function Piece({ params }: { params: PageProps<"/admin/art/pieces/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/art/pieces/${id}`);
  const found = isUuid(id) ? await getAdminArtwork(id) : null;
  if (!found) notFound();
  const [artists, cities] = await Promise.all([listAllArtists(), listAllCities()]);
  const { artwork: a, issued } = found;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4">
        <Link href={`/art/${a.slug}`} className={adminLink}>View on the site</Link>
        <Link href={`/admin/editions?piece=${a.id}`} className={adminLink}>{issued} numbered piece{issued === 1 ? "" : "s"} issued</Link>
      </div>
      <PieceForm piece={a} artists={artists} cities={cities} issued={issued} />
      {issued === 0 && (
        <Section title="Delete">
          <AdminForm action={deleteArtwork} submit="Delete this piece" variant="danger" confirmText={`Delete “${a.title}”? This can't be undone.`}>
            <input type="hidden" name="id" value={a.id} />
            <p className="text-sm text-muted">Only a piece no one has bought can be deleted.</p>
          </AdminForm>
        </Section>
      )}
    </div>
  );
}
