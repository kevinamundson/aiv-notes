import type { NoteStore } from "@/lib/notes/types";
import { FsNoteStore } from "@/lib/notes/fs-store";
import { BlobNoteStore } from "@/lib/notes/blob-store";
import {
  hasBlobCredentials,
  isVercelRuntime,
  readBlobReadWriteToken,
} from "@/lib/notes/env";

export {
  NoteStoreUnavailableError,
  isNoteStoreUnavailableError,
} from "@/lib/notes/errors";
export { assertBlobConfiguredForWrite } from "@/lib/notes/assert";

let singleton: NoteStore | null = null;

/**
 * Local `next dev` (no VERCEL): FsNoteStore unless a Blob token is present.
 * On Vercel (VERCEL / VERCEL_ENV): always BlobNoteStore — never FS (/var/task is EROFS).
 * Token is read dynamically so Next cannot bake an empty value at build time.
 */
export function getNoteStore(): NoteStore {
  if (singleton) return singleton;

  if (isVercelRuntime()) {
    singleton = new BlobNoteStore();
    return singleton;
  }

  if (readBlobReadWriteToken() || hasBlobCredentials()) {
    singleton = new BlobNoteStore();
  } else {
    singleton = new FsNoteStore();
  }
  return singleton;
}

/** Reports `blob` on every Vercel deploy; otherwise reflects local choice. */
export function noteStoreBackend(): "blob" | "fs" {
  if (isVercelRuntime()) return "blob";
  return readBlobReadWriteToken() || hasBlobCredentials() ? "blob" : "fs";
}

export type { NoteStore } from "@/lib/notes/types";
