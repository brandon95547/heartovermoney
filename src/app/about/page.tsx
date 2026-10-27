// About (business plan, "Website Blueprint"): who Heart Over Money is, the artists, and how
// to reach the team.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { PageHeader, SectionLabel, Skeleton, buttonClass } from "@/components/ui";
import { getContent, paragraphs } from "@/lib/content";
import { listArtists } from "@/lib/queries";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main>
      <PageHeader title="About" back="/" />
      <article className="space-y-8 p-5">
        <section className="space-y-3">
          <h2 className="text-2xl font-bold leading-tight">Heart Over Money</h2>
          <Suspense fallback={<Skeleton className="h-32" />}><Intro /></Suspense>
          <Link href="/mission" className="inline-flex items-center gap-1 text-sm font-semibold underline">Read the mission <ChevronRight className="size-4" /></Link>
        </section>
        <section>
          <SectionLabel className="mb-3">The artists</SectionLabel>
          <Suspense fallback={<Skeleton className="h-40" />}><Artists /></Suspense>
        </section>
        <section className="space-y-3 rounded-md bg-fog p-5">
          <SectionLabel>Collectors</SectionLabel>
          <p className="text-sm leading-relaxed">VIP members can buy every limited piece, before and during each event. The 700 Club, with 700 seats, gets early access to every city drop, documentary previews and first access to artist proofs.</p>
          <Link href="/membership" className={buttonClass("black", "w-full")}>Membership</Link>
        </section>
        <section className="space-y-3">
          <SectionLabel>Get in touch</SectionLabel>
          <p className="text-sm leading-relaxed">Churches, musicians, artists and partners who want to be part of a city campaign: we&apos;d love to hear from you.</p>
          <Link href="/contact" className={buttonClass("outline", "w-full")}>Contact us</Link>
        </section>
      </article>
    </main>
  );
}

async function Artists() {
  const artists = await listArtists();
  return (
    <ul className="divide-y divide-line">
      {artists.map((a) => (
        <li key={a.slug}>
          <Link href={`/artists/${a.slug}`} className="flex items-center gap-3 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink font-bold text-white">{a.name[0]}</span>
            <span className="min-w-0 flex-1"><span className="block font-semibold">{a.name}</span>{a.bio && <span className="block truncate text-xs text-muted">{a.bio}</span>}</span>
            <ChevronRight className="size-4 shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// The introduction, as edited in the admin panel (Content).
async function Intro() {
  const { "about.intro": text } = await getContent(["about.intro"]);
  return paragraphs(text).map((p) => <p key={p} className="leading-relaxed">{p}</p>);
}
