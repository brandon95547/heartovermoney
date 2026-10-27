import { saveLot } from "@/app/actions/admin/auctions";
import { AdminForm } from "@/components/admin-form";
import { CheckField, DateTimeField, ImagesField, MoneyField, SelectField, TextArea, TextField } from "@/components/admin-ui";
import { ArtImage } from "@/components/art-image";
import type { schema } from "@/db";

type Lot = typeof schema.lots.$inferSelect;

export function LotForm({ lot, events }: { lot?: Lot; events: { id: string; title: string; cityName: string }[] }) {
  return (
    <AdminForm action={saveLot} submit={lot ? "Save" : "Add the lot"}>
      {lot && <input type="hidden" name="id" value={lot.id} />}
      <SelectField label="Event" name="eventId" required defaultValue={lot?.eventId} options={events.map((e) => [e.id, `${e.title} · ${e.cityName}`] as const)} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Title" name="title" required maxLength={120} defaultValue={lot?.title} />
        <TextField label="Maker" name="maker" required maxLength={120} defaultValue={lot?.maker} />
      </div>
      <TextField label="What's in the lot" name="quantityLabel" maxLength={80} defaultValue={lot?.quantityLabel} placeholder="1 original canvas" />
      <TextArea label="Description" name="description" required rows={4} defaultValue={lot?.description} />
      <div className="grid grid-cols-3 gap-3">
        <MoneyField label="Retail value" name="retail" required cents={lot?.retailValueCents} />
        <MoneyField label="Starting bid" name="startingBid" required cents={lot?.startingBidCents} />
        <MoneyField label="Buy Now" name="buyNow" cents={lot?.buyNowCents} hint="VIPs, before the event. Empty: none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DateTimeField label="Bidding opens" name="startsAt" required value={lot?.auctionStartsAt} />
        <DateTimeField label="Bidding closes" name="endsAt" required value={lot?.auctionEndsAt} />
      </div>
      <CheckField label="Art: only VIP members can buy or bid" name="isArt" defaultChecked={lot?.isArt ?? true} />
      {lot && lot.images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {lot.images.map((src) => (
            <label key={src} className="block text-xs">
              <span className="relative block aspect-square overflow-hidden rounded-sm bg-mist"><ArtImage src={src} alt="" sizes="120px" /></span>
              <span className="mt-1 flex items-center gap-1.5"><input type="checkbox" name="removeImage" value={src} className="accent-alert" /> Remove</span>
            </label>
          ))}
        </div>
      )}
      <ImagesField />
    </AdminForm>
  );
}
