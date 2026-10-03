import { BLOB_NOT_CONFIGURED_MESSAGE } from "@/lib/notes/env";

export class NoteStoreUnavailableError extends Error {
  readonly status = 503;
  constructor(message = BLOB_NOT_CONFIGURED_MESSAGE) {
    super(message);
    this.name = "NoteStoreUnavailableError";
  }
}

export function isNoteStoreUnavailableError(
  e: unknown,
): e is NoteStoreUnavailableError {
  return e instanceof NoteStoreUnavailableError;
}
