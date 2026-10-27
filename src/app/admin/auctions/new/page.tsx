import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTitle } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listEventsBrief } from "@/lib/admin-queries";
import { LotForm } from "../lot-form";

export const metadata: Metadata = { title: "New lot" };

export default function NewLotPage() {
  return (
    <main className="p-5">
      <AdminTitle title="New lot" back={{ href: "/admin/auctions", label: "Auction lots" }} />
      <Suspense fallback={<Skeleton className="h-96" />}><Form /></Suspense>
    </main>
  );
}

async function Form() {
  await requireAdmin("/admin/auctions/new");
  return <LotForm events={await listEventsBrief()} />;
}
