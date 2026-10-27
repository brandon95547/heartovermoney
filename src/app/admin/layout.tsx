// The admin panel: its tabs (shown only to admins) over each section. Every page checks for an
// admin itself too; the layout only decides whether to draw the tabs.
import { Suspense } from "react";
import { getUser } from "@/lib/dal";
import { AdminNav } from "./admin-nav";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <Suspense fallback={null}><AdminTabs /></Suspense>
      {children}
    </>
  );
}

async function AdminTabs() {
  const user = await getUser();
  return user?.role === "admin" ? <AdminNav /> : null;
}
