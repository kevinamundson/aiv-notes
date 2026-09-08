"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_BOOK, DEFAULT_CHAPTER } from "@/lib/constants";

type Item = { id: string; name: string; complete?: boolean };

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
  const complete = items.filter((t) => t.complete);
  const list = complete.length ? complete : items;
  return (
    <label className="text-sm">
      <span className="mr-2 opacity-70">Translation</span>
      <select
        className="rounded border border-scripture/20 bg-parchment px-2 py-1"
        value={current}
        onChange={(e) => {
          router.push(`/${e.target.value}/${book}/${chapter}`);
        }}
      >
        {list.map((t) => (
          <option key={t.id} value={t.id}>
            {t.id} — {t.name}
          </option>
        ))}
      </select>
      <noscript>
        <ul className="mt-1 flex flex-wrap gap-2 text-xs">
          {list.slice(0, 12).map((t) => (
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
