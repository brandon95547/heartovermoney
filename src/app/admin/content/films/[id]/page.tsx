import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deleteFilm } from "@/app/actions/admin/content";
import { AdminForm } from "@/components/admin-form";
import { AdminTitle, Section, adminLink } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/admin-forms";
import { getAdminFilm, listAllCities } from "@/lib/admin-queries";
import { FilmForm } from "../../film-form";

export const metadata: Metadata = { title: "Film" };

export default function FilmAdminPage(props: PageProps<"/admin/content/films/[id]">) {
  return (
    <main className="p-5">
      <AdminTitle title="Film" back={{ href: "/admin/content", label: "Content" }} />
      <Suspense fallback={<Skeleton className="h-96" />}><Film params={props.params} /></Suspense>
    </main>
  );
}

async function Film({ params }: { params: PageProps<"/admin/content/films/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/content/films/${id}`);
  const film = isUuid(id) ? await getAdminFilm(id) : null;
  if (!film) notFound();
  return (
    <div className="space-y-8">
      <Link href={`/films/${film.slug}`} className={adminLink}>View on the site</Link>
      <FilmForm film={film} cities={await listAllCities()} />
      <Section title="Delete">
        <AdminForm action={deleteFilm} submit="Delete this film" variant="danger" confirmText={`Delete “${film.title}”?`}>
          <input type="hidden" name="id" value={film.id} />
        </AdminForm>
      </Section>
    </div>
  );
}
