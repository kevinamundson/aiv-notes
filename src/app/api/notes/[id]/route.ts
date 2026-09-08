import { NextResponse } from "next/server";
import { requireWriterSession } from "@/lib/auth";
import { getNoteStore } from "@/lib/notes";
import type { NoteUpdateInput } from "@/types/note";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const note = await getNoteStore().getById(id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await requireWriterSession();
  if (
    !session &&
    !(note.visibility === "public" && note.status === "approved-by-kevin")
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ note });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await requireWriterSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: NoteUpdateInput;
  try {
    body = (await request.json()) as NoteUpdateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const note = await getNoteStore().update(id, body);
    return NextResponse.json({ note });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await requireWriterSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  await getNoteStore().delete(id);
  return NextResponse.json({ ok: true });
}
