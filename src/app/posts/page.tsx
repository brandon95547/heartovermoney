// The Posts feed, Home on the Posts side of the navigation (screen design pages 6–9 and 27):
// every event's photos, newest first.
import type { Metadata } from "next";
import { Suspense } from "react";
import { PhotoWall } from "@/components/photo-wall";
import { getUser } from "@/lib/dal";
import { getNextEvent, listPhotos } from "@/lib/queries";

export const metadata: Metadata = { title: "Posts" };

export default function PostsPage() {
  return (
    <main className="fixed inset-0 z-30 mx-auto max-w-md bg-black text-white md:max-w-2xl">
      <Suspense fallback={<div className="flex h-full items-center justify-center text-sm">Loading photos…</div>}>
        <Feed />
      </Suspense>
    </main>
  );
}

async function Feed() {
  const user = await getUser();
  const [photos, next] = await Promise.all([listPhotos(null, user?.id), getNextEvent()]);
  // New photos go to the event that is on now, or the next one.
  return <PhotoWall photos={photos} viewer={user && { id: user.id, isAdmin: user.role === "admin" }} postHref={next ? `/events/${next.slug}/photos/new` : undefined} showEvent />;
}
