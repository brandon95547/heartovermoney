import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

// Photos people post, and pictures added in the admin panel, are kept on disk outside the
// build, so they survive deploys, and served by the /media route. Override with UPLOAD_DIR
// (for example, a mounted volume on staging).
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");

// The file's path on disk. The folder is filled at run time, so the build is told not to trace
// it (otherwise it would copy the whole project into the server output).
export const uploadPath = (name: string) => path.join(/* turbopackIgnore: true */ UPLOAD_DIR, name);

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

// Checks a picture before it's saved: the reason it can't be, or null.
export function uploadProblem(file: File): string | null {
  if (!TYPES[file.type]) return "Pictures can be JPEG, PNG or WebP.";
  if (file.size > MAX_UPLOAD_BYTES) return "Pictures can be up to 12 MB.";
  return null;
}

// Saves a checked picture under a new random name and returns its address, /media/<name>.
export async function saveUpload(file: File): Promise<string> {
  const name = `${crypto.randomUUID()}.${TYPES[file.type]}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(uploadPath(name), Buffer.from(await file.arrayBuffer()));
  return `/media/${name}`;
}

// The pictures chosen in a form's file input (empty inputs send one empty file).
export const chosenFiles = (form: FormData, name: string) =>
  form.getAll(name).filter((f): f is File => f instanceof File && f.size > 0);
