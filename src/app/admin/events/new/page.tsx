import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTitle } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listAllCities } from "@/lib/admin-queries";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <main className="p-5">
      <AdminTitle title="New event" back={{ href: "/admin/events", label: "Events" }} />
      <Suspense fallback={<Skeleton className="h-96" />}><Form /></Suspense>
    </main>
  );
}

async function Form() {
  await requireAdmin("/admin/events/new");
  return <EventForm cities={await listAllCities()} />;
}
