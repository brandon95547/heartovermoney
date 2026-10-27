// Art: the pieces for sale (each with its edition and release), the artists and the
// collections (one per city, with its story).
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminTitle, Pill, Section, adminLink } from "@/components/admin-ui";
import { ArtImage } from "@/components/art-image";
import { Empty, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listAdminArtworks, listAllArtists, listAllCities } from "@/lib/admin-queries";
import { dayAndTime, kindLabel, money } from "@/lib/format";

export const metadata: Metadata = { title: "Art" };

export default function AdminArtPage() {
  return (
    <main className="p-5">
      <AdminTitle title="Art" />
      <Suspense fallback={<Skeleton className="h-96" />}><Art /></Suspense>
    </main>
  );
}

async function Art() {
  await requireAdmin("/admin/art");
  const [pieces, artists, cities] = await Promise.all([listAdminArtworks(), listAllArtists(), listAllCities()]);
  const now = new Date();
  return (
    <div className="space-y-10">
      <Section title={`Pieces (${pieces.length})`} action={<Link href="/admin/art/pieces/new" className={adminLink}>+ New piece</Link>}>
        {pieces.length ? (
          <ul className="divide-y divide-line">
            {pieces.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/art/pieces/${p.id}`} className="flex gap-3 py-3">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-sm bg-mist"><ArtImage src={p.images[0]} alt="" sizes="56px" /></span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block truncate font-semibold">{p.title}</span>
                    <span className="block truncate text-xs text-muted">{p.artistName} · {p.cityName} · {kindLabel[p.kind]}</span>
                    <span className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className="font-semibold">{money(p.priceCents)}</span>
                      <span>{p.issued} of {p.editionSize} issued</span>
                      {p.issued >= p.editionSize && <Pill tone="ink">Sold out</Pill>}
                      {p.releasesAt && p.releasesAt > now && <Pill tone="vip">Releases {dayAndTime(p.releasesAt, now)}</Pill>}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <Empty>No pieces yet.</Empty>}
      </Section>
      <Section title={`Artists (${artists.length})`} action={<Link href="/admin/art/artists/new" className={adminLink}>+ New artist</Link>}>
        <ul className="divide-y divide-line">
          {artists.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/art/artists/${a.id}`} className="flex justify-between gap-3 py-3 text-sm">
                <span className="min-w-0"><span className="block font-semibold">{a.name}</span>{a.bio && <span className="block truncate text-xs text-muted">{a.bio}</span>}</span>
                <span className="shrink-0 text-xs text-muted">{a.pieces} piece{a.pieces === 1 ? "" : "s"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <Section title={`Collections (${cities.length})`} action={<Link href="/admin/art/collections/new" className={adminLink}>+ New collection</Link>}>
        <ul className="divide-y divide-line">
          {cities.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/art/collections/${c.id}`} className="flex items-center gap-3 py-3 text-sm">
                <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-sm bg-mist"><ArtImage src={c.heroImage} alt="" sizes="64px" /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold">{c.name}, {c.state}</span>
                  <span className="text-xs text-muted">{c.visitedOn ? `Visited ${c.visitedOn.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "America/New_York" })}` : "Next city"} · {c.pieces} piece{c.pieces === 1 ? "" : "s"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
