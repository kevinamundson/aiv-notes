import { hasBlobCredentials, isVercelRuntime } from "@/lib/notes/env";
import { NoteStoreUnavailableError } from "@/lib/notes/errors";

/** Throw 503-class error when Vercel Blob credentials are missing (writes). */
export function assertBlobConfiguredForWrite(): void {
  if (!isVercelRuntime()) return;
  if (!hasBlobCredentials()) {
    throw new NoteStoreUnavailableError();
  }
}
