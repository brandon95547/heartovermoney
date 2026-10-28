// Chat: the Connections Messenger (screen design pages 3–4; development overview pages 2–3),
// reached from the Posts section's Chat icon or at the end of the card process. Who gets in
// depends on where they actually stand (the client's navigation, October 2026):
//   not signed in            -> sign in or create an account, then back here
//   signed in, not registered -> the next event's card process, which ends here
//   registered               -> the Messenger
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Link2, MessageCircle } from "lucide-react";
import { Empty, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { eventDate } from "@/lib/format";
import { getNextEvent, getRegistration, listAttendees } from "@/lib/queries";

export const metadata: Metadata = { title: "Connections Messenger" };

export default function ChatPage(props: PageProps<"/chat">) {
  return (
    <main>
      <PageHeader title="Messages" />
      <Suspense fallback={<Skeleton className="m-5 h-96" />}><Messenger searchParams={props.searchParams} /></Suspense>
    </main>
  );
}

async function Messenger({ searchParams }: { searchParams: PageProps<"/chat">["searchParams"] }) {
  const [user, event, sp] = await Promise.all([getUser(), getNextEvent(), searchParams]);
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-5 px-8 py-14 text-center">
        <MessageCircle className="size-12" strokeWidth={1.25} />
        <h2 className="text-xl font-bold">The Connections Messenger</h2>
        <p className="text-sm leading-relaxed text-muted">Meet the other guests at the event. Sign in, or create an account, and register for the event with your collector card to join.</p>
        <Link href="/signin?next=/chat" className={buttonClass("black", "w-full")}>Sign in</Link>
        <Link href="/signup?next=/chat" className={buttonClass("outline", "w-full")}>Create account</Link>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="space-y-4 p-5">
        <Empty>The Messenger opens for each event once registration does. The next city and date are on their way.</Empty>
        <Link href="/" className={buttonClass("outline", "w-full")}>See the collections</Link>
      </div>
    );
  }
  // Registration comes first; the card process ends back here.
  if (!(await getRegistration(event.id, user.id))) redirect("/events?for=chat");

  const tab = sp.tab === "connections" ? "connections" : "messages";
  const attendees = await listAttendees(event.id, user.id);
  const tabClass = (on: boolean) => `flex h-14 w-20 items-center justify-center ${on ? "bg-paper" : "bg-fog"}`;
  return (
    <div>
      <div className="flex items-center gap-4 px-5 pt-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-ink text-xl font-bold text-white">{user.displayName[0]}</span>
        <div className="min-w-0">
          <p className="truncate text-lg">{user.displayName}</p>
          <p className="truncate text-sm text-muted">{user.tagline ?? <Link href="/settings" className="underline">Add a line about you</Link>}</p>
        </div>
      </div>
      <div className="mx-5 mt-4 rounded-md bg-alert px-4 py-3 text-center text-white">
        <p className="font-bold">Welcome to the Connections Messenger!</p>
        <p className="mt-1 text-xs leading-relaxed">
          Before {event.title} in {event.cityName}, see who else is coming and connect with them. Connections are open for a limited time; guests who
          haven&apos;t connected become anonymous after the event.
        </p>
      </div>
      <nav aria-label="Messenger" className="mt-4 flex bg-fog">
        <Link href="/chat" aria-current={tab === "messages" ? "page" : undefined} aria-label="Messages" className={tabClass(tab === "messages")}><MessageCircle className="size-6" strokeWidth={1.5} /></Link>
        <Link href="/chat?tab=connections" aria-current={tab === "connections" ? "page" : undefined} aria-label="Connections" className={tabClass(tab === "connections")}><Link2 className="size-6" strokeWidth={1.5} /></Link>
      </nav>
      <p className="px-5 pt-3 text-[11px] font-bold uppercase tracking-[0.14em]">{tab === "messages" ? "Messages" : "Connections"}</p>
      {tab === "messages" ? (
        <div className="p-5">
          <Empty>No messages yet. Conversations with the guests you connect with will appear here.</Empty>
        </div>
      ) : (
        <div className="p-5">
          <p className="mb-3 text-xs text-muted">Registered for {event.title} · {eventDate(event.startsAt)}</p>
          {attendees.length ? (
            <ul className="divide-y divide-line">
              {attendees.map((a) => (
                <li key={a.id} className="flex items-center gap-4 py-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mist font-bold">{a.displayName[0]}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{a.displayName}</span>
                    <span className="block truncate text-sm text-muted">{a.tagline ?? `@${a.username}`}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : <Empty>No other guests have registered yet.</Empty>}
        </div>
      )}
    </div>
  );
}
