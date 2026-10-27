import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTitle } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listAllCities } from "@/lib/admin-queries";
import { FilmForm } from "../../film-form";

export const metadata: Metadata = { title: "New film" };

export default function NewFilmPage() {
  return (
    <main className="p-5">
      <AdminTitle title="New film" back={{ href: "/admin/content", label: "Content" }} />
      <Suspense fallback={<Skeleton className="h-96" />}><Form /></Suspense>
    </main>
  );
}

async function Form() {
  await requireAdmin("/admin/content/films/new");
  return <FilmForm cities={await listAllCities()} />;
}
