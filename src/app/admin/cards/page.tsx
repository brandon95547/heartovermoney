// An event's collector cards: the deck by design, every card and who holds it, adding cards,
// and fixing registrations (mail a card, cancel one).
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { addCardRun, cancelRegistration, importCards, markCardMailed, removeCard } from "@/app/actions/admin/cards";
import { AdminForm } from "@/components/admin-form";
import { AdminTitle, Pill, Section, SelectField, TextArea, TextField, adminLink } from "@/components/admin-ui";
import { Empty, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/admin-forms";
import { listAdminCards, listEventsBrief } from "@/lib/admin-queries";
import { CARD_DESIGNS } from "@/lib/cards";
import { getNextEvent } from "@/lib/queries";

export const metadata: Metadata = { title: "Cards" };

export default function AdminCardsPage(props: PageProps<"/admin/cards">) {
  return (
    <main className="p-5">
      <AdminTitle title="Collector cards" />
      <Suspense fallback={<Skeleton className="h-96" />}><Cards searchParams={props.searchParams} /></Suspense>
    </main>
  );
}

const small = "[&_button]:h-8 [&_button]:px-3 [&_button]:text-xs";

async function Cards({ searchParams }: { searchParams: PageProps<"/admin/cards">["searchParams"] }) {
  await requireAdmin("/admin/cards");
  const sp = await searchParams;
  const [events, next] = await Promise.all([listEventsBrief(), getNextEvent()]);
  const eventId = isUuid(sp.event) ? sp.event : next?.id ?? events[0]?.id;
  if (!eventId) return <Empty>Add an event first; its cards are added here.</Empty>;
  const cards = await listAdminCards(eventId);
  const designs = Object.keys(CARD_DESIGNS) as (keyof typeof CARD_DESIGNS)[];
  const tally = designs.map((d) => {
    const of = cards.filter((c) => c.design === d);
    return { d, total: of.length, claimed: of.filter((c) => c.registrationId).length, handed: of.filter((c) => c.checkedInAt || c.shippedAt).length };
  });
  return (
    <div className="space-y-8">
      <form action="/admin/cards" className="flex items-end gap-3">
        <div className="flex-1"><SelectField label="Event" name="event" defaultValue={eventId} options={events.map((e) => [e.id, `${e.title} · ${e.cityName}`] as const)} /></div>
        <button className="rounded-full bg-ink px-4 py-3 text-xs font-bold text-white">Show</button>
      </form>
      <div className="grid grid-cols-3 gap-3 text-sm">
        {tally.map((t) => (
          <div key={t.d} className="rounded-md border border-line p-3">
            <p className="font-bold">{CARD_DESIGNS[t.d].face} {CARD_DESIGNS[t.d].name}</p>
            <p className="text-xs">{t.total - t.claimed} left of {t.total}</p>
            <p className="text-xs text-muted">{t.claimed} registered · {t.handed} handed over</p>
          </div>
        ))}
      </div>
      <Section title={`The deck (${cards.length})`} action={<Link href="/admin/check-in" className={adminLink}>Door check-in</Link>}>
        {cards.length ? (
          <ul className="divide-y divide-line">
            {cards.map((c) => (
              <li key={c.id} className="space-y-2 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span><span className="font-mono font-semibold">{c.code}</span> <span className="text-xs text-muted">{CARD_DESIGNS[c.design].name}</span></span>
                  {!c.registrationId ? <Pill>Available</Pill>
                    : c.checkedInAt ? <Pill tone="go">Handed over</Pill>
                    : c.fulfillment === "ship" ? (c.shippedAt ? <Pill tone="go">Mailed</Pill> : <Pill tone="alert">To mail</Pill>)
                    : <Pill tone="vip">At the door</Pill>}
                </div>
                {c.registrationId && (
                  <p className="text-xs">
                    @{c.username}{c.jokerChoice === "kept" ? " · kept the Joker (VIP access)" : c.jokerChoice === "gift_card" ? " · $20 gift card" : ""}
                    {c.fulfillment === "ship" && c.shipAddress ? ` · ${c.shipAddress}` : ""}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {!c.registrationId && (
                    <AdminForm action={removeCard} submit="Remove" variant="outline" className={small}><input type="hidden" name="id" value={c.id} /></AdminForm>
                  )}
                  {c.registrationId && c.fulfillment === "ship" && !c.shippedAt && (
                    <AdminForm action={markCardMailed} submit="Mark mailed" variant="outline" className={small}><input type="hidden" name="registrationId" value={c.registrationId} /></AdminForm>
                  )}
                  {c.registrationId && !c.checkedInAt && (
                    <AdminForm action={cancelRegistration} submit="Cancel registration" variant="danger" className={small}
                      confirmText={`Cancel @${c.username}'s registration? Their card goes back into the deck.`}>
                      <input type="hidden" name="registrationId" value={c.registrationId} />
                    </AdminForm>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : <Empty>No cards in this event&apos;s deck yet.</Empty>}
      </Section>
      <Section title="Add a run of cards">
        <AdminForm action={addCardRun} submit="Add the cards" variant="outline">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="grid grid-cols-3 gap-3">
            <SelectField label="Design" name="design" options={designs.map((d) => [d, CARD_DESIGNS[d].name] as const)} />
            <TextField label="How many" name="count" type="number" min={1} max={1000} required defaultValue={10} />
            <TextField label="Code prefix" name="prefix" maxLength={10} defaultValue="HOM" />
          </div>
          <p className="text-xs text-muted">Codes continue from the highest already used, e.g. HOM-0031.</p>
        </AdminForm>
      </Section>
      <Section title="Import printed cards">
        <AdminForm action={importCards} submit="Import" variant="outline">
          <input type="hidden" name="eventId" value={eventId} />
          <TextArea label="Codes" name="codes" rows={6} placeholder={"HOM-1001, joker\nHOM-1002, queen"} hint="One per line: the code printed on the card, then joker, queen or rabbit. Codes already in use are skipped." />
        </AdminForm>
      </Section>
    </div>
  );
}
