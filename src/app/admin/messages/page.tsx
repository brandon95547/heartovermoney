// Messages sent from the Contact page: open ones first. Reply by email; mark it handled here.
import type { Metadata } from "next";
import { Suspense } from "react";
import { toggleMessageHandled } from "@/app/actions/admin/messages";
import { AdminTitle, Pill } from "@/components/admin-ui";
import { Empty, Skeleton, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listMessages } from "@/lib/admin-queries";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <main className="p-5">
      <AdminTitle title="Messages" />
      <Suspense fallback={<Skeleton className="h-64" />}><Messages /></Suspense>
    </main>
  );
}

async function Messages() {
  await requireAdmin("/admin/messages");
  const messages = await listMessages();
  if (!messages.length) return <Empty>No messages yet. They arrive from the Contact page.</Empty>;
  return (
    <ul className="space-y-4">
      {messages.map((m) => (
        <li key={m.id} className={`space-y-2 rounded-md border p-4 text-sm ${m.handledAt ? "border-line opacity-70" : "border-ink"}`}>
          <div className="flex items-start justify-between gap-3">
            <p><b>{m.name}</b> · <a href={`mailto:${m.email}`} className="underline">{m.email}</a></p>
            {m.handledAt ? <Pill tone="go">Handled</Pill> : <Pill tone="alert">Open</Pill>}
          </div>
          <p className="whitespace-pre-line leading-relaxed">{m.message}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{m.createdAt.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })}</span>
            <form action={toggleMessageHandled}>
              <input type="hidden" name="id" value={m.id} />
              <button className={buttonClass("outline", "h-9 px-4 text-xs")}>{m.handledAt ? "Reopen" : "Mark handled"}</button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
