// Shared by the admin panel's Server Actions: turning a refused change into the form's message,
// saving the pictures a form sent, and refreshing the site after a change.
import "server-only";
import { revalidatePath } from "next/cache";
import type { AdminState } from "@/components/admin-form";
import { AdminError } from "@/lib/admin";
import { chosenFiles, saveUpload, uploadProblem } from "@/lib/uploads";

export async function attempt(run: () => Promise<AdminState>): Promise<AdminState> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof AdminError) return { error: err.message };
    if ((err as { cause?: { code?: string } }).cause?.code === "23505") return { error: "That address (slug) or code is already used. Choose another." };
    throw err;
  }
}

export async function savePictures(form: FormData, key = "images") {
  const files = chosenFiles(form, key);
  for (const f of files) {
    const problem = uploadProblem(f);
    if (problem) throw new AdminError(problem);
  }
  return Promise.all(files.map(saveUpload));
}

// Admin changes are rare and touch many pages, so the whole site is refreshed.
export const refreshSite = () => revalidatePath("/", "layout");
