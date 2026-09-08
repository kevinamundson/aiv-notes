import { redirect } from "next/navigation";
import {
  DEFAULT_BOOK,
  DEFAULT_CHAPTER,
  DEFAULT_TRANSLATION_ID,
} from "@/lib/constants";

export default function HomePage() {
  redirect(`/${DEFAULT_TRANSLATION_ID}/${DEFAULT_BOOK}/${DEFAULT_CHAPTER}`);
}
