import { NextResponse } from "next/server";

/**
 * STUB ONLY — future HelloAO-shaped commentary reader.
 * Intended: GET /api/c/aiv-notes/?verseId=GEN.1.1 → AIVNote[]
 * Do not build HelloAO compiler in M1. See docs/helloao-commentary-stub.md.
 * Use GET /api/notes?verseId= for M1 list-by-verse.
 */
export async function GET(request: Request) {
  const verseId = new URL(request.url).searchParams.get("verseId");
  return NextResponse.json(
    {
      stub: true,
      message:
        "M1 stub only — HelloAO commentary compiler not built. Use GET /api/notes?verseId=.",
      verseId,
      see: "docs/helloao-commentary-stub.md",
    },
    { status: 501 },
  );
}
