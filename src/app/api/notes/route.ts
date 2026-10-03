import { NextResponse } from "next/server";
import { requireWriterSession } from "@/lib/auth";
import {
  getNoteStore,
  isNoteStoreUnavailableError,
} from "@/lib/notes";
import type { NoteCreateInput } from "@/types/note";

/** List notes by verseId (public read of house/public; writers see all for their session). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const verseId = searchParams.get("verseId");
  if (!verseId) {
    return NextResponse.json({ error: "verseId required" }, { status: 400 });
  }
  try {
    const store = getNoteStore();
    const notes = await store.listByVerse(verseId);
    const session = await requireWriterSession();
    const visible = session
      ? notes
      : notes.filter(
          (n) =>
            n.visibility === "public" && n.status === "approved-by-kevin",
        );
    return NextResponse.json({ notes: visible, verseId });
  } catch (e) {
    if (isNoteStoreUnavailableError(e)) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    throw e;
  }
}

/** Create note — allowlisted writers only. */
export async function POST(request: Request) {
  const session = await requireWriterSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: NoteCreateInput;
  try {
    body = (await request.json()) as NoteCreateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const note = await getNoteStore().create(body);
    return NextResponse.json({ note }, { status: 201 });
  } catch (e) {
    if (isNoteStoreUnavailableError(e)) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
