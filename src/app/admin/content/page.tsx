// Content: the home page's current drop, the Mission and About introductions, and the films.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { saveContent } from "@/app/actions/admin/content";
import { AdminForm } from "@/components/admin-form";
import { AdminTitle, Pill, Section, SelectField, TextArea, TextField, adminLink } from "@/components/admin-ui";
import { ArtImage } from "@/components/art-image";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listAdminFilms, listAllCities } from "@/lib/admin-queries";
import { getContent } from "@/lib/content";
import { filmKindLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Content" };

export default function AdminContentPage() {
  return (
    <main className="p-5">
      <AdminTitle title="Content" />
      <Suspense fallback={<Skeleton className="h-96" />}><Content /></Suspense>
    </main>
  );
}

async function Content() {
  await requireAdmin("/admin/content");
  const [c, cities, films] = await Promise.all([
    getContent(["home.featuredCity", "home.featuredHeadline", "home.featuredText", "mission.intro", "about.intro"]),
    listAllCities(), listAdminFilms(),
  ]);
  return (
    <div className="space-y-10">
      <Section title="Home page: the current drop" action={<Link href="/" className={adminLink}>View</Link>}>
        <AdminForm action={saveContent}>
          <SelectField label="Collection" name="home.featuredCity" defaultValue={c["home.featuredCity"]}
            options={[["", "None (no banner)"], ...cities.map((x) => [x.slug, `${x.name}, ${x.state}`] as const)]} />
          <TextField label="Headline" name="home.featuredHeadline" maxLength={120} defaultValue={c["home.featuredHeadline"]} placeholder="The Charlotte collection" />
          <TextField label="Line under it" name="home.featuredText" maxLength={200} defaultValue={c["home.featuredText"]} placeholder="Numbered, never reprinted. VIP members first." />
        </AdminForm>
      </Section>
      <Section title="The mission: introduction" action={<Link href="/mission" className={adminLink}>View</Link>}>
        <AdminForm action={saveContent}>
          <TextArea label="Text" name="mission.intro" rows={8} defaultValue={c["mission.intro"]} hint="A blank line between paragraphs. Empty goes back to the original text." />
        </AdminForm>
      </Section>
      <Section title="About: introduction" action={<Link href="/about" className={adminLink}>View</Link>}>
        <AdminForm action={saveContent}>
          <TextArea label="Text" name="about.intro" rows={6} defaultValue={c["about.intro"]} hint="A blank line between paragraphs. Empty goes back to the original text." />
        </AdminForm>
      </Section>
      <Section title={`Films and stories (${films.length})`} action={<Link href="/admin/content/films/new" className={adminLink}>+ New film</Link>}>
        <ul className="divide-y divide-line">
          {films.map((f) => (
            <li key={f.id}>
              <Link href={`/admin/content/films/${f.id}`} className="flex items-center gap-3 py-3 text-sm">
                <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-sm bg-mist"><ArtImage src={f.poster} alt="" sizes="64px" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{f.title}</span>
                  <span className="text-xs text-muted">{filmKindLabel[f.kind]}{f.cityName ? ` · ${f.cityName}` : ""}</span>
                </span>
                {!f.videoUrl && <Pill>Premieres soon</Pill>}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
