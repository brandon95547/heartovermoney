// One event's photo wall, opened from the photos on its Overview.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PhotoWall } from "@/components/photo-wall";
import { getUser } from "@/lib/dal";
import { getEvent, listPhotos } from "@/lib/queries";

export default function PhotoWallPage(props: PageProps<"/events/[slug]/photos">) {
  return (
    <main className="fixed inset-0 z-30 mx-auto max-w-md bg-black text-white md:max-w-2xl">
      <Suspense fallback={<div className="flex h-full items-center justify-center text-sm">Loading photos…</div>}>
        <Wall params={props.params} />
      </Suspense>
    </main>
  );
}

async function Wall({ params }: { params: PageProps<"/events/[slug]/photos">["params"] }) {
  const { slug } = await params;
  const found = await getEvent(slug);
  if (!found) notFound();
  const user = await getUser();
  const photos = await listPhotos(found.event.id, user?.id);
  return <PhotoWall photos={photos} back={{ href: `/events/${slug}`, label: "Back to the event" }} postHref={`/events/${slug}/photos/new`} />;
}
