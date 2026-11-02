// Unit tests for the AIV USX parser and the retired-id mapping.
// Run: npm test (node --test; Node 22.18+ strips TypeScript types natively).
import assert from "node:assert/strict";
import { test } from "node:test";
import { convertUsxChapter, usxBookName } from "../src/lib/usx-to-chapter.ts";
import { normalizeTranslationId, translationLabel } from "../src/lib/constants.ts";

const HEAD = `<?xml version="1.0" encoding="UTF-8"?><usx version="3.1"><book code="HAB" style="id">eng_aiv Amundson Interpretive Version</book>
<para style="h">Habakkuk</para><para style="toc1">Habakkuk</para><para style="toc2">Habakkuk</para><para style="toc3">Hab</para><para style="mt1">Habakkuk</para>
<para style="rem">id=eng_aiv</para>`;

const verses = (r) => r.content.filter((c) => c.type === "verse");
const plain = (v) => v.content.map((p) => (typeof p === "string" ? p : p.text ?? "")).join("");

test("book name comes from h/toc/mt, not chapter text", () => {
  assert.equal(usxBookName(`${HEAD}<chapter number="1" style="c" sid="HAB 1"/>`), "Habakkuk");
});

test("d holding a verse, cls colophon split, chapter-end d postscript", () => {
  const usx = `${HEAD}
<chapter number="3" style="c" sid="HAB 3"/>
<para style="s1">Habakkuk’s Prayer</para>
<para style="r">(Psalm 77:1–20)</para>
<para style="d"><verse number="1" style="v" sid="HAB 3:1"/>A prayer of Habakkuk the prophet. <verse eid="HAB 3:1"/></para>
<para style="cls"><verse number="2" style="v" sid="HAB 3:2"/>These are the generations, </para>
<para style="p" vid="HAB 3:2">in the <char style="add">day</char>. <verse eid="HAB 3:2"/></para>
<para style="d">To the one directing.<note caller="+" style="f"><char style="ft">fn</char></note></para>
<chapter eid="HAB 3"/></usx>`;
  const r = convertUsxChapter(usx, "HAB", 3);
  assert.equal(r.bookName, "Habakkuk");
  assert.deepEqual(
    r.content.map((c) => (c.type === "heading" ? c.kind : c.type)),
    ["section", "ref", "verse", "verse", "subtitle"],
  );
  const vs = verses(r);
  assert.deepEqual(vs.map((v) => v.number), [1, 2]);
  assert.equal(plain(vs[0]), "A prayer of Habakkuk the prophet. ");
  assert.equal(plain(vs[1]), "These are the generations, in the day. ");
  assert.equal(r.content[4].content[0], "To the one directing.");
  assert.equal(r.footnotes.length, 1);
});

test("Psalm superscription before verse 1; qa after an eid does not join the verse", () => {
  const usx = `${HEAD}
<chapter number="119" style="c" sid="PSA 119"/>
<para style="d">A Psalm of David.</para>
<para style="qa">אALEPH</para>
<para style="q1"><verse number="1" style="v" sid="PSA 119:1"/>Blessed <char style="add">are</char> the upright, </para>
<para style="qs" vid="PSA 119:1">Selah <verse eid="PSA 119:1"/></para>
<para style="qa" vid="PSA 119:1">בBETH<verse eid="PSA 119:1"/></para>
<para style="q1"><verse number="2" style="v" sid="PSA 119:2"/>How can a young man <verse eid="PSA 119:2"/></para>
<chapter eid="PSA 119"/></usx>`;
  const r = convertUsxChapter(usx, "PSA", 119);
  assert.deepEqual(
    r.content.map((c) => (c.type === "heading" ? `${c.kind}:${c.content[0]}` : `v${c.number}`)),
    ["subtitle:A Psalm of David.", "section:אALEPH", "v1", "section:בBETH", "v2"],
  );
  assert.equal(plain(verses(r)[0]), "Blessed are the upright, Selah ");
});

test("retired BLB-Draft id maps to eng_aiv; labels say AIV", () => {
  assert.equal(normalizeTranslationId("BLB-Draft"), "eng_aiv");
  assert.equal(normalizeTranslationId("blb-draft"), "eng_aiv");
  assert.equal(normalizeTranslationId("BSB"), "BSB");
  assert.equal(normalizeTranslationId("eng_wmu"), "eng_wmu");
  assert.equal(translationLabel("eng_aiv"), "AIV");
  assert.equal(translationLabel("BLB-Draft"), "AIV");
  assert.equal(translationLabel("BSB"), "BSB");
});

test("d between two verses (inscription) stays with the verse before it", () => {
  const usx = `${HEAD}
<chapter number="28" style="c" sid="EXO 28"/>
<para style="p"><verse number="36" style="v" sid="EXO 28:36"/>engrave on it: <verse eid="EXO 28:36"/></para>
<para style="d">HOLY TO YHWH.</para>
<para style="p"><verse number="37" style="v" sid="EXO 28:37"/>And you shall put it <verse eid="EXO 28:37"/></para>
<para style="d">Postscript.</para>
<chapter eid="EXO 28"/></usx>`;
  const r = convertUsxChapter(usx, "EXO", 28);
  assert.deepEqual(r.content.map((c) => c.type === "heading" ? c.kind : c.type), ["verse", "verse", "subtitle"]);
  assert.equal(plain(verses(r)[0]).replace(/\s+/g, " "), "engrave on it: HOLY TO YHWH.");
});

test("cls colophon, then s1, then `p vid=` continuation stays one verse (pass 5 shape)", () => {
  const usx = `${HEAD}
<chapter number="2" style="c" sid="GEN 2"/>
<para style="p"><verse number="3" style="v" sid="GEN 2:3"/>And God blessed. <verse eid="GEN 2:3"/></para>
<para style="cls"><verse number="4" style="v" sid="GEN 2:4"/>These <char style="add">are</char> the generations, </para>
<para style="s1">Man and Woman in the Garden</para>
<para style="p" vid="GEN 2:4">in the day when YHWH God made. <verse eid="GEN 2:4"/><verse number="5" style="v" sid="GEN 2:5"/>And every shrub. <verse eid="GEN 2:5"/></para>
<chapter eid="GEN 2"/></usx>`;
  const r = convertUsxChapter(usx, "GEN", 2);
  assert.deepEqual(
    r.content.map((c) => (c.type === "heading" ? c.kind : `v${c.number}`)),
    ["v3", "v4", "section", "v5"],
  );
  assert.equal(plain(verses(r)[1]), "These are the generations, in the day when YHWH God made. ");
});
