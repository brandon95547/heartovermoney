import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui";
import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <main className="flex flex-1 flex-col px-8 pb-10 pt-4">
      <Link href="/" className="self-end text-sm">Skip</Link>
      <div className="flex justify-center py-10"><Logo size={72} /></div>
      <h1 className="mb-6 text-center text-lg font-bold">Join Heart Over Money</h1>
      <Suspense fallback={<Skeleton className="h-96" />}><SignUpForm /></Suspense>
    </main>
  );
}
