"use client";

// The two halves of "Forgot details?": ask for a link, then set the new password.
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, resetPassword, type ResetState } from "@/app/actions/auth";
import { Field, buttonClass } from "@/components/ui";

export function RequestResetForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(requestPasswordReset, undefined);
  if (state?.sent) {
    return (
      <div role="status" className="space-y-4 text-center">
        <p className="font-semibold">Check your email</p>
        <p className="text-sm text-muted">If an account uses that address, we&apos;ve sent it a link to set a new password. The link works once, for an hour.</p>
        <Link href="/signin" className={buttonClass("outline", "w-full")}>Back to sign in</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <p className="text-center text-sm text-muted">Enter the email you signed up with and we&apos;ll send you a link to set a new password.</p>
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      {state?.error && <p role="alert" className="text-center text-sm text-alert">{state.error}</p>}
      <button disabled={pending} className={buttonClass("black", "w-full uppercase tracking-[0.2em]")}>{pending ? "Sending…" : "Send the link"}</button>
      <p className="text-center text-sm"><Link href="/signin" className="font-semibold underline">Back to sign in</Link></p>
    </form>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-center text-sm text-muted">Choose a new password, at least 8 characters.</p>
      <Field label="New password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      {state?.error && <p role="alert" className="text-center text-sm text-alert">{state.error}</p>}
      <button disabled={pending} className={buttonClass("black", "w-full uppercase tracking-[0.2em]")}>{pending ? "Saving…" : "Save and sign in"}</button>
    </form>
  );
}
