import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTitle } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin";
import { CityForm } from "../../city-form";

export const metadata: Metadata = { title: "New collection" };

export default function NewCollectionPage() {
  return (
    <main className="p-5">
      <AdminTitle title="New collection" back={{ href: "/admin/art", label: "Art" }} />
      <Suspense fallback={null}><Form /></Suspense>
    </main>
  );
}

async function Form() {
  await requireAdmin("/admin/art/collections/new");
  return <CityForm />;
}
