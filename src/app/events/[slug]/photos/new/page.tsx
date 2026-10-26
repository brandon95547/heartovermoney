import type { Metadata } from "next";
import { Suspense } from "react";
import { PhotoForm } from "@/components/event-client";
import { PageHeader, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Post a photo" };

export default function NewPhotoPage(props: PageProps<"/events/[slug]/photos/new">) {
  return (
    <main>
      <Suspense fallback={<Skeleton className="m-5 h-96" />}><NewPhoto params={props.params} /></Suspense>
    </main>
  );
}

async function NewPhoto({ params }: { params: PageProps<"/events/[slug]/photos/new">["params"] }) {
  const { slug } = await params;
  await requireUser(`/events/${slug}/photos/new`);
  return (
    <>
      <PageHeader title="Post a photo" back={`/events/${slug}/photos`} />
      <div className="p-5"><PhotoForm slug={slug} /></div>
    </>
  );
}
