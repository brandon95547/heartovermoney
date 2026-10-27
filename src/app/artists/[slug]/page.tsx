// An artist: who they are, their pieces across the cities, and Follow, which puts their new
// works first on the Products home ("New Works by Artists You Follow", screen design page 24).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { toggleFollow } from "@/app/actions/account";
import { ArtworkCard } from "@/components/cards";
import { Empty, PageHeader, SectionLabel, Skeleton, buttonClass } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { withNext } from "@/lib/next-path";
import { getArtist, listArtworks } from "@/lib/queries";

export default function ArtistPage(props: PageProps<"/artists/[slug]">) {
  return (
    <main>
      <PageHeader title="Artist" back="/" />
      <Suspense fallback={<Skeleton className="m-5 h-96" />}><Artist params={props.params} /></Suspense>
    </main>
  );
}

async function Artist({ params }: { params: PageProps<"/artists/[slug]">["params"] }) {
  const { slug } = await params;
  const user = await getUser();
  const [artist, works] = await Promise.all([getArtist(slug, user?.id), listArtworks({ artistSlug: slug })]);
  if (!artist) notFound();
  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-ink text-2xl font-bold text-white">{artist.name[0]}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold">{artist.name}</h2>
          <p className="text-xs text-muted">{artist.followers} follower{artist.followers === 1 ? "" : "s"} · {works.length} piece{works.length === 1 ? "" : "s"}</p>
        </div>
      </div>
      {artist.bio && <p className="text-sm leading-relaxed">{artist.bio}</p>}
      {user ? (
        <form action={toggleFollow}>
          <input type="hidden" name="slug" value={artist.slug} />
          <button className={buttonClass(artist.following ? "outline" : "black", "w-full")}>{artist.following ? "Following" : "Follow"}</button>
        </form>
      ) : (
        <Link href={withNext("/signin", `/artists/${artist.slug}`)} className={buttonClass("black", "w-full")}>Sign in to follow</Link>
      )}
      <section>
        <SectionLabel className="mb-3">Works</SectionLabel>
        {works.length
          ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{works.map((a) => <ArtworkCard key={a.slug} a={a} wide />)}</div>
          : <Empty>New works from {artist.name} are on the way.</Empty>}
      </section>
    </div>
  );
}
