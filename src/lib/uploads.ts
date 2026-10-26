import path from "node:path";

// Photos people post are kept on disk outside the build, so they survive deploys, and served
// by the /media route. Override with UPLOAD_DIR (for example, a mounted volume on staging).
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");

// The file's path on disk. The folder is filled at run time, so the build is told not to trace
// it (otherwise it would copy the whole project into the server output).
export const uploadPath = (name: string) => path.join(/* turbopackIgnore: true */ UPLOAD_DIR, name);
