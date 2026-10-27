"use client";

// The admin panel's forms: a Server Action, the fields (rendered on the server and passed in
// as children), its message, and the button. `confirmText` asks first, for changes that can't
// be undone (a refund, voiding a piece).
import { useActionState } from "react";
import { buttonClass } from "@/components/ui";

export type AdminState = { error?: string; ok?: string } | undefined;

export function AdminForm({ action, children, submit = "Save", variant = "black", confirmText, className = "space-y-4" }: {
  action: (state: AdminState, form: FormData) => Promise<AdminState>;
  children?: React.ReactNode;
  submit?: string;
  variant?: "black" | "outline" | "danger";
  confirmText?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const style = variant === "danger" ? buttonClass("outline", "border-alert text-alert hover:bg-alert/5") : buttonClass(variant);
  return (
    <form action={formAction} className={className}
      onSubmit={confirmText ? (e) => { if (!window.confirm(confirmText)) e.preventDefault(); } : undefined}>
      {children}
      {state?.error && <p role="alert" className="text-sm text-alert">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-go">{state.ok}</p>}
      <button disabled={pending} className={style}>{pending ? "Saving…" : submit}</button>
    </form>
  );
}
