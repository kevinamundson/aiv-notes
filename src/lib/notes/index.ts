import type { NoteStore } from "@/lib/notes/types";
import { FsNoteStore } from "@/lib/notes/fs-store";
import { BlobNoteStore } from "@/lib/notes/blob-store";

let singleton: NoteStore | null = null;

/**
 * Default: FsNoteStore for local `next dev`.
 * When BLOB_READ_WRITE_TOKEN is set (Vercel), use BlobNoteStore.
 * Vercel Hobby has an ephemeral filesystem — prefer Blob/KV in production.
 */
export function getNoteStore(): NoteStore {
  if (singleton) return singleton;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    singleton = new BlobNoteStore();
  } else {
    singleton = new FsNoteStore();
  }
  return singleton;
}

export function noteStoreBackend(): "blob" | "fs" {
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "fs";
}

export type { NoteStore } from "@/lib/notes/types";
