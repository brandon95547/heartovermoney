import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTitle } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listAllArtists, listAllCities } from "@/lib/admin-queries";
import { PieceForm } from "../piece-form";

export const metadata: Metadata = { title: "New piece" };

export default function NewPiecePage() {
  return (
    <main className="p-5">
      <AdminTitle title="New piece" back={{ href: "/admin/art", label: "Art" }} />
      <Suspense fallback={<Skeleton className="h-96" />}><Form /></Suspense>
    </main>
  );
}

async function Form() {
  await requireAdmin("/admin/art/pieces/new");
  const [artists, cities] = await Promise.all([listAllArtists(), listAllCities()]);
  return <PieceForm artists={artists} cities={cities} />;
}
