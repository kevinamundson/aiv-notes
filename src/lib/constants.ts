export const DEFAULT_TRANSLATION_ID = "BLB-Draft";
export const DEFAULT_BOOK = "GEN";
export const DEFAULT_CHAPTER = 1;

export const BLB_DRAFT_ID = "BLB-Draft";
export const BLB_DRAFT_NAME = "Berean Literal Bible (Draft)";
export const BLB_DRAFT_BADGE = "DRAFT";

export const HELLOAO_API_BASE = "https://bible.helloao.org/api";
/** Preferred live USX host for BLB-Draft (never HelloAO). */
export const AIVBIBLE_USX_BASE = "https://aivbible.kevinamundson.me/usx";

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
