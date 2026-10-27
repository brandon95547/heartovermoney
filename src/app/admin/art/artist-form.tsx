import { saveArtist } from "@/app/actions/admin/art";
import { AdminForm } from "@/components/admin-form";
import { TextArea, TextField } from "@/components/admin-ui";

export function ArtistForm({ artist }: { artist?: { id: string; name: string; slug: string; bio: string | null } }) {
  return (
    <AdminForm action={saveArtist} submit={artist ? "Save" : "Add the artist"}>
      {artist && <input type="hidden" name="id" value={artist.id} />}
      <TextField label="Name" name="name" required maxLength={80} defaultValue={artist?.name} />
      <TextField label="Address" name="slug" maxLength={60} defaultValue={artist?.slug} hint="heartovermoney.com/artists/… — made from the name if empty" />
      <TextArea label="About" name="bio" rows={5} maxLength={2000} defaultValue={artist?.bio ?? ""} />
    </AdminForm>
  );
}
