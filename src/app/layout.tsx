import type { Metadata } from "next";
import { AuthControls } from "@/components/AuthControls";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIV Notes — Kevin Amundson",
  description:
    "Kevin's interpretive notes beside Scripture (Amundson Interpretive Version (AIV) + Free Use Bible API). Notes are never Scripture.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-parchment text-scripture antialiased">
        <header className="border-b border-scripture/10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium tracking-wide">AIV Notes writer</p>
              <p className="text-xs opacity-60">
                Notes are never Scripture · default AIV (draft) · no finished-translation claim
              </p>
            </div>
            <AuthControls />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs opacity-60">
          Default Scripture: Amundson Interpretive Version (AIV), draft, read live from{" "}
          <a
            className="underline"
            href="https://aivbible.kevinamundson.me/"
            target="_blank"
            rel="noreferrer"
          >
            aivbible.kevinamundson.me
          </a>
          . Other English ids from{" "}
          <a className="underline" href="https://bible.helloao.org" target="_blank" rel="noreferrer">
            bible.helloao.org
          </a>
          . Kevin&apos;s comments are interpretive only — never Scripture.
        </footer>
      </body>
    </html>
  );
}
