// A conversation in the Connections Messenger with one other guest: theirs on the left, yours
// on the right, the newest at the foot by the message box. The + in the header connects, the
// same as swiping the conversation in the list. Open while the event's connections are, and
// for good between Connections (lib/messenger).
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/event-client";
import { Composer, ConnectButton, ConversationEffects } from "@/components/messenger";
import { PageHeader, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { dayAndTime } from "@/lib/format";
import { getPeer, getThread } from "@/lib/messenger";
import { getNextEvent, getRegistration } from "@/lib/queries";

export const metadata: Metadata = { title: "Connections Messenger" };

export default function ConversationPage(props: PageProps<"/chat/[username]">) {
  return (
    <main>
      <Suspense fallback={<><PageHeader title="Messages" back="/chat" /><Skeleton className="m-5 h-96" /></>}>
        <Conversation params={props.params} />
      </Suspense>
    </main>
  );
}

// A time over the messages where the conversation picks up again after a quiet spell.
const GAP_MS = 15 * 60_000;

async function Conversation({ params }: { params: PageProps<"/chat/[username]">["params"] }) {
  const username = decodeURIComponent((await params).username);
  const [user, event] = await Promise.all([requireUser(`/chat/${username}`), getNextEvent()]);
  const peer = await getPeer(user.id, username);
  if (!peer) {
    if (event && !(await getRegistration(event.id, user.id))) redirect("/events?for=chat");
    notFound();
  }
  const messages = await getThread(user.id, peer.id);
  const now = new Date();
  return (
    <>
      <PageHeader title={peer.displayName} back="/chat"
        right={<ConnectButton username={peer.username} name={peer.displayName} state={peer.state} canConnect={peer.canConnect} />} />
      <AutoRefresh seconds={5} />
      <ConversationEffects username={peer.username} latest={messages.at(-1)?.id ?? null} />
      {peer.tagline && <p className="border-b border-line px-5 py-2 text-center text-sm text-muted">{peer.tagline}</p>}
      <ol className="flex flex-col gap-1.5 px-4 pb-28 pt-4">
        {messages.length ? messages.map((m, i) => {
          const gap = i === 0 || m.createdAt.getTime() - messages[i - 1].createdAt.getTime() > GAP_MS;
          return (
            <li key={m.id} className="contents">
              {gap && <p className="pb-1 pt-3 text-center text-xs text-muted">{dayAndTime(m.createdAt, now)}</p>}
              <p className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-[15px] leading-snug ${
                m.fromMe ? "self-end rounded-br-md bg-ink text-white" : "self-start rounded-bl-md bg-fog"}`}>
                <span className="sr-only">{m.fromMe ? "You" : peer.displayName}: </span>{m.body}
              </p>
            </li>
          );
        }) : (
          <li className="py-10 text-center text-sm text-muted">Say hello to {peer.displayName.split(" ")[0]}.</li>
        )}
      </ol>
      <Composer to={peer.username} />
    </>
  );
}
