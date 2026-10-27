import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTitle } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin";
import { ArtistForm } from "../../artist-form";

export const metadata: Metadata = { title: "New artist" };

export default function NewArtistPage() {
  return (
    <main className="p-5">
      <AdminTitle title="New artist" back={{ href: "/admin/art", label: "Art" }} />
      <Suspense fallback={null}><Form /></Suspense>
    </main>
  );
}

async function Form() {
  await requireAdmin("/admin/art/artists/new");
  return <ArtistForm />;
}
