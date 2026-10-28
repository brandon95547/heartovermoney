// Food and drink at the event: everything is ordered through the site.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MenuForm } from "@/components/event-client";
import { PageHeader, Skeleton } from "@/components/ui";
import { getEvent, listMenu } from "@/lib/queries";

export const metadata: Metadata = { title: "Food + drink" };

export default function MenuPage(props: PageProps<"/events/[slug]/menu">) {
  return (
    <main>
      <Suspense fallback={<><PageHeader title="Food + Drink" /><Skeleton className="m-5 h-96" /></>}>
        <Menu params={props.params} />
      </Suspense>
    </main>
  );
}

async function Menu({ params }: { params: PageProps<"/events/[slug]/menu">["params"] }) {
  const { slug } = await params;
  const found = await getEvent(slug);
  if (!found) notFound();
  const items = await listMenu(found.event.id);
  return (
    <>
      <PageHeader title="Food + Drink" back={`/events/${slug}`} />
      <div className="p-5">
        <p className="mb-5 text-sm text-muted">{found.event.title} · {found.cityName}</p>
        <MenuForm slug={slug} items={items} />
      </div>
    </>
  );
}
