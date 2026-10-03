"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BLB_DRAFT_ID, DEFAULT_BOOK, DEFAULT_CHAPTER } from "@/lib/constants";

type Item = { id: string; name: string; complete?: boolean; draft?: boolean };

export function TranslationPicker({
  items,
  current,
  book,
  chapter,
}: {
  items: Item[];
  current: string;
  book: string;
  chapter: number;
}) {
  const router = useRouter();
  // BLB-Draft always first; then complete eng, then remaining (exact case).
  const blb = items.filter((t) => t.id === BLB_DRAFT_ID);
  const rest = items.filter((t) => t.id !== BLB_DRAFT_ID);
  const complete = rest.filter((t) => t.complete);
  const other = rest.filter((t) => !t.complete);
  const list = [...blb, ...(complete.length ? complete : rest), ...(complete.length ? other : [])];
  // Dedupe while preserving order
  const seen = new Set<string>();
  const ordered = list.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  return (
    <label className="text-sm">
      <span className="mr-2 opacity-70">Translation</span>
      <select
        className="rounded border border-scripture/20 bg-parchment px-2 py-1"
        value={current}
        onChange={(e) => {
          // Preserve exact case (eng_wmu ≠ ENG_WMU).
          router.push(`/${e.target.value}/${book}/${chapter}`);
        }}
      >
        {ordered.map((t) => (
          <option key={t.id} value={t.id}>
            {t.id}
            {t.draft || t.id === BLB_DRAFT_ID ? " [DRAFT]" : ""} — {t.name}
          </option>
        ))}
      </select>
      <noscript>
        <ul className="mt-1 flex flex-wrap gap-2 text-xs">
          {ordered.slice(0, 12).map((t) => (
            <li key={t.id}>
              <Link href={`/${t.id}/${book || DEFAULT_BOOK}/${chapter || DEFAULT_CHAPTER}`}>
                {t.id}
              </Link>
            </li>
          ))}
        </ul>
      </noscript>
    </label>
  );
}
