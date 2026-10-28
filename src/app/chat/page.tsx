// Chat: the Connections Messenger (screen design pages 3–4; development overview pages 2–3),
// reached from the Posts section's Chat icon or at the end of the card process. Who gets in
// depends on where they actually stand (the client's navigation, October 2026):
//   not signed in            -> sign in or create an account, then back here
//   signed in, not registered -> the next event's card process, which ends here
//   registered               -> the Messenger
// Messages lists the conversations; the chain link lists the event's other guests, each a way
// to start one. Swiping a conversation left shows the red +, to connect before time runs out.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BubbleIcon, ChainIcon, ConversationRow, TimeLeft } from "@/components/messenger";
import { AutoRefresh } from "@/components/event-client";
import { Empty, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { eventDate, messageTime } from "@/lib/format";
import { connectionsCloseAt, listConversations, listGuests } from "@/lib/messenger";
import { getNextEvent, getRegistration } from "@/lib/queries";

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
  const [user, event, sp] = await Promise.all([requireUser("/chat"), getNextEvent(), searchParams]);
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
  const [conversations, guests] = await Promise.all([
    listConversations(user.id, event.id),
    tab === "connections" ? listGuests(event.id, user.id) : Promise.resolve([]),
  ]);
  const unread = conversations.reduce((t, c) => t + c.unread, 0);
  const now = new Date();
  const tabClass = (on: boolean) => `flex h-14 w-20 items-center justify-center ${on ? "bg-paper" : "bg-fog"}`;
  return (
    <div>
      <AutoRefresh seconds={10} />
      <div className="flex items-center gap-4 px-5 pt-5">
        <span className="relative shrink-0">
          <span className="flex size-12 items-center justify-center rounded-full bg-ink text-xl font-bold text-white">{user.displayName[0]}</span>
          {unread > 0 && (
            <span className="absolute -left-2.5 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1.5 text-[13px] font-bold text-white">
              {unread}<span className="sr-only"> unread</span>
            </span>
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg">{user.displayName}</p>
          <p className="truncate text-sm text-muted">{user.tagline ?? <Link href="/settings" className="underline">Add a line about you</Link>}</p>
        </div>
      </div>
      <p className="mx-5 mt-4 rounded-md bg-alert px-3 py-3 text-center text-sm font-semibold text-white">Welcome to the Connections Messenger!</p>
      <nav aria-label="Messenger" className="mt-4 flex bg-fog">
        <Link href="/chat" aria-current={tab === "messages" ? "page" : undefined} aria-label="Messages" className={tabClass(tab === "messages")}><BubbleIcon /></Link>
        <Link href="/chat?tab=connections" aria-current={tab === "connections" ? "page" : undefined} aria-label="Connections" className={tabClass(tab === "connections")}><ChainIcon /></Link>
      </nav>
      <div className="flex items-baseline justify-between gap-3 px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.14em]">{tab === "messages" ? "Messages" : "Connections"}</p>
        {tab === "messages" && <TimeLeft until={connectionsCloseAt(event.startsAt).toISOString()} />}
      </div>
      {tab === "messages" ? (
        conversations.length ? (
          <ul className="mt-3 border-t border-line">
            {conversations.map((c) => (
              <ConversationRow key={c.username} username={c.username} name={c.displayName} time={messageTime(c.createdAt, now)}
                preview={c.fromMe ? `You: ${c.body}` : c.body} unread={c.unread} state={c.state} canConnect={c.canConnect} />
            ))}
          </ul>
        ) : (
          <div className="p-5">
            <Empty>No messages yet. Tap the chain link to see who else is coming, and say hello.</Empty>
          </div>
        )
      ) : (
        <div className="p-5">
          <p className="mb-3 text-xs text-muted">Registered for {event.title} · {eventDate(event.startsAt)}</p>
          {guests.length ? (
            <ul className="divide-y divide-line">
              {guests.map((g) => (
                <li key={g.username}>
                  <Link href={`/chat/${g.username}`} className="flex items-center gap-4 py-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mist font-bold">{g.displayName[0]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{g.displayName}</span>
                      <span className="block truncate text-sm text-muted">{g.tagline ?? `@${g.username}`}</span>
                    </span>
                    {g.state === "connected" && <span title="Connected"><ChainIcon className="h-3.5 w-7 text-muted" /><span className="sr-only">Connected</span></span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty>No other guests have registered yet.</Empty>}
        </div>
      )}
    </div>
  );
}
