// A certificate of authenticity (business plan, "Product Strategy"): title, edition number,
// city, date, artist, the collection's story and song, and a QR code to the city's story.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import { ArtImage } from "@/components/art-image";
import { Logo } from "@/components/logo";
import { PageHeader, Skeleton } from "@/components/ui";
import { kindLabel } from "@/lib/format";
import { getCertificate } from "@/lib/queries";
import { siteUrl } from "@/lib/site";

export default function CertificatePage(props: PageProps<"/certificates/[code]">) {
  return (
    <main>
      <PageHeader title="Certificate" back="/vault" />
      <Suspense fallback={<Skeleton className="m-5 h-[32rem]" />}><Certificate params={props.params} /></Suspense>
    </main>
  );
}

async function Certificate({ params }: { params: PageProps<"/certificates/[code]">["params"] }) {
  const { code } = await params;
  const c = await getCertificate(decodeURIComponent(code));
  if (!c) notFound();
  const storyUrl = `${siteUrl()}/cities/${c.citySlug}`;
  const qr = await QRCode.toString(storyUrl, { type: "svg", margin: 0, width: 132 });
  const date = c.issuedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });

  return (
    <article className="p-5">
      <div className="space-y-5 rounded-md border-2 border-ink p-5">
        <div className="flex items-center justify-between">
          <Logo size={44} />
          <p className="text-right text-[10px] font-bold uppercase tracking-[0.18em]">Certificate of<br />Authenticity</p>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-sm bg-mist"><ArtImage src={c.images[0]} alt={c.title} priority /></div>
        <div>
          <h2 className="text-2xl font-bold leading-tight">{c.title}</h2>
          <p className="text-sm">No. <b>{c.number}</b> of {c.editionSize} · {kindLabel[c.kind]}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div><dt className="text-xs text-muted">Artist</dt><dd className="font-semibold">{c.artistName}</dd></div>
          <div><dt className="text-xs text-muted">City</dt><dd className="font-semibold">{c.cityName}, {c.cityState}</dd></div>
          <div><dt className="text-xs text-muted">Production date</dt><dd className="font-semibold">{date}</dd></div>
          {c.songTitle && <div><dt className="text-xs text-muted">Song</dt><dd className="font-semibold">{c.songTitle}</dd></div>}
          {c.ownerUsername && <div><dt className="text-xs text-muted">Collected by</dt><dd className="font-semibold">@{c.ownerUsername}</dd></div>}
        </dl>
        <div>
          <p className="text-xs text-muted">Collection story</p>
          <p className="text-sm leading-relaxed">{c.story}</p>
        </div>
        <div className="flex items-center gap-4 border-t border-line pt-4">
          <span className="shrink-0" dangerouslySetInnerHTML={{ __html: qr }} aria-label={`QR code to the ${c.cityName} story`} role="img" />
          <p className="text-xs leading-relaxed">
            Scan to see the {c.cityName} story: the music, the people and the city behind this piece.{" "}
            <Link href={`/cities/${c.citySlug}`} className="font-semibold underline">Open it</Link>
          </p>
        </div>
        <p className="break-all font-mono text-[11px] text-muted">{c.code}</p>
      </div>
      <p className="mt-4 text-center text-xs text-muted">This edition is limited to {c.editionSize} and will never be reprinted in this size or format.</p>
    </article>
  );
}
