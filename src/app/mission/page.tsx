// The mission (business plan: overview, vision, the marketing flywheel, evangelism and the
// local church): why the company travels and how a city campaign works.
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PageHeader, SectionLabel, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "The mission" };

const CAMPAIGN = [
  "Announce the next city.",
  "Recruit local churches, volunteers, musicians and community partners.",
  "Enter the city and document the journey.",
  "Pray with people, share the Good News and serve the community.",
  "Perform and record music in public, and film the music video.",
  "Tell the stories of the people we met.",
  "Reveal the artwork inspired by the trip, and open the numbered collection.",
  "Sell until the edition is gone, and reveal where the movement goes next.",
];

export default function MissionPage() {
  return (
    <main>
      <PageHeader title="The mission" back="/" />
      <article className="space-y-8 p-5">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <Logo size={80} />
          <p className="text-xs font-bold uppercase tracking-[0.2em]">One city · One mission · One testimony · One limited art collection</p>
        </div>
        <section className="space-y-3">
          <h2 className="text-2xl font-bold leading-tight">Art from the mission</h2>
          <p className="leading-relaxed">We travel city by city making music, sharing the Gospel, filming what happens, and turning those experiences into highly limited collectible artwork.</p>
          <p className="leading-relaxed">Collectors own numbered pieces connected to real people, real cities and real moments, and that revenue helps send the mission to the next city. Every collection exists for a reason: a city visited, a song, a music video, a group of people, a mission and a story of faith. The city becomes part of the artwork&apos;s history.</p>
          <p className="font-bold">Each purchase helps send the next outreach.</p>
        </section>
        <section>
          <SectionLabel className="mb-3">How a city campaign works</SectionLabel>
          <ol className="space-y-3">
            {CAMPAIGN.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="space-y-3 rounded-md bg-fog p-5">
          <SectionLabel>The heartbeat of the movement</SectionLabel>
          <p className="text-sm leading-relaxed">Sharing the love of Christ comes first. Teams spend time praying with people, listening, helping communities and supporting the churches already there. Public worship events are free.</p>
          <p className="text-sm leading-relaxed">Commerce happens around the movement, never as the price of taking part. Something meaningful happened here; we documented it through art. If the story means something to you, you can own one of the limited pieces connected to it.</p>
        </section>
        <section className="space-y-3">
          <SectionLabel>With the local church</SectionLabel>
          <p className="text-sm leading-relaxed">We don&apos;t replace local churches; we amplify them. Before each trip we partner with local ministries for volunteers, prayer teams, musicians and follow-up, so the people we meet have somewhere to keep growing after the touring team leaves.</p>
        </section>
        <div className="grid gap-3">
          <Link href="/films" className={buttonClass("black", "w-full")}>Watch the films</Link>
          <Link href="/" className={buttonClass("outline", "w-full")}>See the collections</Link>
        </div>
      </article>
    </main>
  );
}
