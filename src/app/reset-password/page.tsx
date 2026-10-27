// "Forgot details?" (screen design page 1): ask for a link to set a new password.
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { PageHeader } from "@/components/ui";
import { RequestResetForm } from "./forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Forgot details" back="/signin" />
      <div className="flex flex-1 flex-col px-8 pb-10">
        <div className="flex justify-center py-12"><Logo size={86} /></div>
        <RequestResetForm />
      </div>
    </main>
  );
}
