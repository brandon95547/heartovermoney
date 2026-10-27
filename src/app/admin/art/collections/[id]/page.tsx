import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminTitle, adminLink } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/admin-forms";
import { getAdminCity } from "@/lib/admin-queries";
import { CityForm } from "../../city-form";

export const metadata: Metadata = { title: "Collection" };

export default function CollectionPage(props: PageProps<"/admin/art/collections/[id]">) {
  return (
    <main className="p-5">
      <AdminTitle title="Collection" back={{ href: "/admin/art", label: "Art" }} />
      <Suspense fallback={<Skeleton className="h-96" />}><Collection params={props.params} /></Suspense>
    </main>
  );
}

async function Collection({ params }: { params: PageProps<"/admin/art/collections/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/art/collections/${id}`);
  const city = isUuid(id) ? await getAdminCity(id) : null;
  if (!city) notFound();
  return (
    <div className="space-y-6">
      <Link href={`/cities/${city.slug}`} className={adminLink}>View on the site</Link>
      <CityForm city={city} />
    </div>
  );
}
