// The Connections Messenger comes after the MVP (screen design pages 3–4). This page says
// what it will be, so the Chat button leads somewhere honest in the meantime.
import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareMore } from "lucide-react";
import { PageHeader, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage() {
  return (
    <main>
      <PageHeader title="Messages" back="/events" />
      <div className="flex flex-col items-center gap-5 px-8 py-16 text-center">
        <MessageSquareMore className="size-12" strokeWidth={1.25} />
        <h2 className="text-xl font-bold">The Connections Messenger is coming</h2>
        <p className="text-sm leading-relaxed text-muted">
          Before each event you&apos;ll see the other guests&apos; name tags and can connect with them for a limited time.
          Guests who haven&apos;t connected become anonymous after the event.
        </p>
        <Link href="/events" className={buttonClass("outline")}>See the events</Link>
      </div>
    </main>
  );
}
