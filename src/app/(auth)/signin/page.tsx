import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui";
import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="flex flex-1 flex-col px-8 pb-10 pt-4">
      <Link href="/" className="self-end text-sm">Skip</Link>
      <div className="flex flex-1 items-center justify-center py-16"><Logo size={104} /></div>
      <Suspense fallback={<Skeleton className="h-64" />}><SignInForm /></Suspense>
    </main>
  );
}
