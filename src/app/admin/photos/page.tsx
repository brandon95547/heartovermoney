// Photos taken off the walls, by an admin or by the community's thumbs-downs, for admins to
// review. Restoring one puts it back and clears its thumbs-downs.
import type { Metadata } from "next";
import { Suspense } from "react";
import { restorePhoto } from "@/app/actions/events";
import { AdminTitle } from "@/components/admin-ui";
import { ArtImage } from "@/components/art-image";
import { Empty, Skeleton, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listRemovedPhotos } from "@/lib/queries";

export const metadata: Metadata = { title: "Removed photos" };

export default function RemovedPhotosPage() {
  return (
    <main className="p-5">
      <AdminTitle title="Removed photos" />
      <Suspense fallback={<Skeleton className="h-64" />}><Removed /></Suspense>
    </main>
  );
}

async function Removed() {
  await requireAdmin("/admin/photos");
  const photos = await listRemovedPhotos();
  if (!photos.length) return <Empty>No photos have been removed. Admins remove a photo from the wall with its bin icon; five thumbs-downs remove one too.</Empty>;
  return (
    <ul className="divide-y divide-line">
      {photos.map((p) => (
        <li key={p.id} className="flex gap-4 py-4">
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
