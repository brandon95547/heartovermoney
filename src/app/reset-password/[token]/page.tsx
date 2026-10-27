// The link from the reset email: set a new password, if the link is still good.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Logo } from "@/components/logo";
import { PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { findReset } from "@/lib/password-reset";
import { NewPasswordForm } from "../forms";

export const metadata: Metadata = { title: "Set a new password" };

export default function NewPasswordPage(props: PageProps<"/reset-password/[token]">) {
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="New password" back="/signin" />
      <div className="flex flex-1 flex-col px-8 pb-10">
        <div className="flex justify-center py-12"><Logo size={86} /></div>
        <Suspense fallback={<Skeleton className="h-40" />}><Reset params={props.params} /></Suspense>
      </div>
    </main>
  );
}

async function Reset({ params }: { params: PageProps<"/reset-password/[token]">["params"] }) {
  const { token } = await params;
  await connection();
  if (!(await findReset(token))) {
    return (
      <div className="space-y-4 text-center">
        <p className="font-semibold">This link has expired</p>
        <p className="text-sm text-muted">Reset links work once, for an hour. Ask for a new one.</p>
        <Link href="/reset-password" className={buttonClass("black", "w-full")}>Send a new link</Link>
      </div>
    );
  }
  return <NewPasswordForm token={token} />;
}
