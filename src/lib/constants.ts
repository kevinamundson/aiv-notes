/** Amundson Interpretive Version — read live from aivbible USX (never HelloAO, never bundled). */
export const AIV_ID = "eng_aiv";
export const AIV_SHORT_NAME = "AIV";
export const AIV_NAME = "Amundson Interpretive Version (AIV)";
export const AIV_BADGE = "DRAFT";

/** Retired id; old URLs and saved notes that cite it resolve to AIV. */
export const LEGACY_DRAFT_ID = "BLB-Draft";

export const DEFAULT_TRANSLATION_ID = AIV_ID;
export const DEFAULT_BOOK = "GEN";
export const DEFAULT_CHAPTER = 1;

export const HELLOAO_API_BASE = "https://bible.helloao.org/api";
/** Live AIV host. */
export const AIVBIBLE_BASE = "https://aivbible.kevinamundson.me";
export const AIVBIBLE_USX_BASE = `${AIVBIBLE_BASE}/usx`;
export const AIVBIBLE_METADATA_URL = `${AIVBIBLE_BASE}/metadata.json`;
/** Seconds a fetched AIV file may be reused before refetching from aivbible. */
export const AIV_REVALIDATE_SECONDS = 60;

/** Map the retired draft id (any case) to eng_aiv; other ids pass through verbatim. */
export function normalizeTranslationId(id: string): string {
  return id.toLowerCase() === LEGACY_DRAFT_ID.toLowerCase() ? AIV_ID : id;
}

/** Short label for UI (AIV for eng_aiv; catalog id otherwise). */
export function translationLabel(id: string | undefined): string {
  if (!id) return "";
  return normalizeTranslationId(id) === AIV_ID ? AIV_SHORT_NAME : id;
}

/** ASCII apostrophe U+0027 — matches Baruch schema. */
export const NOTE_LABEL = "Kevin's comment (not Scripture)";

/** App policy: public visibility requires approved-by-kevin. */
export function assertPublicPolicy(status: string, visibility: string): void {
  if (visibility === "public" && status !== "approved-by-kevin") {
    throw new Error(
      "visibility public requires status approved-by-kevin (NOTES-CONTRACT policy)",
    );
  }
}
