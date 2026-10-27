// The Vault: every numbered piece you own, each with its certificate.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArtImage } from "@/components/art-image";
import { Empty, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { certificatePath } from "@/lib/certificates";
import { requireUser } from "@/lib/dal";
import { listVault } from "@/lib/queries";

export const metadata: Metadata = { title: "Vault" };

export default function VaultPage() {
  return (
    <main>
      <PageHeader title="Vault" back="/profile" />
      <Suspense fallback={<Skeleton className="m-5 h-80" />}><Vault /></Suspense>
    </main>
  );
}

async function Vault() {
  const user = await requireUser("/vault");
  const pieces = await listVault(user.id);
  if (!pieces.length) {
    return (
      <div className="space-y-4 p-5">
        <Empty>Pieces you collect appear here, each with its certificate of authenticity.</Empty>
        <Link href="/" className={buttonClass("primary", "w-full")}>See the collections</Link>
      </div>
    );
  }
  const cities = new Set(pieces.map((p) => p.cityName)).size;
  return (
    <div className="space-y-5 p-5">
      <p className="text-sm">{pieces.length} piece{pieces.length === 1 ? "" : "s"} from {cities} {cities === 1 ? "city" : "cities"}</p>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {pieces.map((p) => (
          <li key={p.code}>
            <Link href={certificatePath(p.code)} className="block">
              <div className="relative aspect-square overflow-hidden rounded-sm bg-mist"><ArtImage src={p.images[0]} alt={p.title} sizes="200px" /></div>
              <p className="mt-2 truncate text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-muted">No. {p.number} of {p.editionSize} · {p.cityName}</p>
              {p.status !== "active" && <p className="text-xs font-semibold text-alert">{p.status === "void" ? "Void" : "Damaged"}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
