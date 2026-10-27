// Contact: a message to the team.
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main>
      <PageHeader title="Contact" back="/about" />
      <div className="space-y-5 p-5">
        <p className="text-sm leading-relaxed text-muted">Questions about a piece, an order or an event, or want to partner with us on a city campaign? Send a message and the team will write back.</p>
        <Suspense fallback={<Skeleton className="h-80" />}><Form /></Suspense>
      </div>
    </main>
  );
}

async function Form() {
  const user = await getUser();
  return <ContactForm name={user?.displayName ?? ""} email={user?.email ?? ""} />;
}
