import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminTitle, adminLink } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/admin-forms";
import { getAdminArtist } from "@/lib/admin-queries";
import { ArtistForm } from "../../artist-form";

export const metadata: Metadata = { title: "Artist" };

export default function ArtistPage(props: PageProps<"/admin/art/artists/[id]">) {
  return (
    <main className="p-5">
      <AdminTitle title="Artist" back={{ href: "/admin/art", label: "Art" }} />
      <Suspense fallback={<Skeleton className="h-64" />}><Artist params={props.params} /></Suspense>
    </main>
  );
}

async function Artist({ params }: { params: PageProps<"/admin/art/artists/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/art/artists/${id}`);
  const artist = isUuid(id) ? await getAdminArtist(id) : null;
  if (!artist) notFound();
  return (
    <div className="space-y-6">
      <Link href={`/artists/${artist.slug}`} className={adminLink}>View on the site</Link>
      <ArtistForm artist={artist} />
    </div>
  );
}
