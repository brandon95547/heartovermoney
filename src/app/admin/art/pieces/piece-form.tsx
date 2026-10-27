// The fields of a piece, new or existing. Pictures already on it can be removed; new ones
// are added at the end.
import { saveArtwork } from "@/app/actions/admin/art";
import { AdminForm } from "@/components/admin-form";
import { DateTimeField, ImagesField, MoneyField, SelectField, TextArea, TextField } from "@/components/admin-ui";
import { ArtImage } from "@/components/art-image";
import { kindLabel } from "@/lib/format";

type Piece = {
  id: string; title: string; slug: string; artistId: string; cityId: string; kind: string; priceCents: number;
  editionSize: number; certificatePrefix: string; description: string; images: string[]; releasesAt: Date | null;
};

export function PieceForm({ piece, artists, cities, issued = 0 }: {
  piece?: Piece; artists: { id: string; name: string }[]; cities: { id: string; name: string; state: string }[]; issued?: number;
}) {
  return (
    <AdminForm action={saveArtwork} submit={piece ? "Save" : "Add the piece"}>
      {piece && <input type="hidden" name="id" value={piece.id} />}
      <TextField label="Title" name="title" required maxLength={120} defaultValue={piece?.title} />
      <TextField label="Address" name="slug" maxLength={60} defaultValue={piece?.slug} hint="heartovermoney.com/art/… — made from the title if empty" />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Artist" name="artistId" required defaultValue={piece?.artistId} options={artists.map((a) => [a.id, a.name] as const)} />
        <SelectField label="Collection" name="cityId" required defaultValue={piece?.cityId} options={cities.map((c) => [c.id, `${c.name}, ${c.state}`] as const)} />
      </div>
      <SelectField label="Kind" name="kind" required defaultValue={piece?.kind ?? "print"}
        hint="Prints and founders art are for VIP members only; merch and shoes are open to everyone."
        options={Object.entries(kindLabel).map(([k, v]) => [k, v] as const)} />
      <div className="grid grid-cols-2 gap-3">
        <MoneyField label="Price" name="price" required cents={piece?.priceCents} />
        <TextField label="Edition size" name="editionSize" type="number" min={Math.max(1, issued)} required defaultValue={piece?.editionSize}
          hint={issued ? `${issued} already issued` : "Never more than this many"} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Certificate code" name="certificatePrefix" required maxLength={8} defaultValue={piece?.certificatePrefix} hint="e.g. JSF, the artist's initials" />
        <DateTimeField label="Releases" name="releasesAt" value={piece?.releasesAt} hint="Eastern time. Before then only VIPs can buy it." />
      </div>
      <TextArea label="Description" name="description" required rows={5} defaultValue={piece?.description} />
      {piece && piece.images.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Pictures</legend>
          <div className="grid grid-cols-3 gap-3">
            {piece.images.map((src) => (
              <label key={src} className="block text-xs">
                <span className="relative block aspect-square overflow-hidden rounded-sm bg-mist"><ArtImage src={src} alt="" sizes="120px" /></span>
                <span className="mt-1 flex items-center gap-1.5"><input type="checkbox" name="removeImage" value={src} className="accent-alert" /> Remove</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <ImagesField />
    </AdminForm>
  );
}
