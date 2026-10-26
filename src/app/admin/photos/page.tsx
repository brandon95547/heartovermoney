// Photos taken off the walls, by an admin or by the community's thumbs-downs, for admins to
// review. Restoring one puts it back and clears its thumbs-downs.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { restorePhoto } from "@/app/actions/events";
import { ArtImage } from "@/components/art-image";
import { Empty, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { listRemovedPhotos } from "@/lib/queries";

export const metadata: Metadata = { title: "Removed photos" };

export default function RemovedPhotosPage() {
  return (
    <main>
      <PageHeader title="Removed photos" back="/profile" />
      <Suspense fallback={<Skeleton className="m-5 h-64" />}><Removed /></Suspense>
    </main>
  );
}

async function Removed() {
  const user = await requireUser("/admin/photos");
  if (user.role !== "admin") notFound();
  const photos = await listRemovedPhotos();
  if (!photos.length) return <div className="p-5"><Empty>No photos have been removed.</Empty></div>;
  return (
    <ul className="divide-y divide-line">
      {photos.map((p) => (
        <li key={p.id} className="flex gap-4 p-5">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-sm bg-mist"><ArtImage src={p.image} alt={p.caption || `Photo by @${p.username}`} sizes="96px" /></div>
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="font-semibold">@{p.username} · {p.eventTitle}</p>
            {p.caption && <p className="truncate">{p.caption}</p>}
            <p className="text-xs text-muted">
              {p.removedBy === "admin" ? "Removed by an admin" : `Removed by ${p.downvotes} thumbs-downs`}
              {p.removedAt && ` · ${p.removedAt.toLocaleDateString("en-US", { timeZone: "America/New_York" })}`}
            </p>
            <form action={restorePhoto}>
              <input type="hidden" name="photoId" value={p.id} />
              <button className={buttonClass("outline", "mt-1 h-9 px-4 text-xs")}>Restore</button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
