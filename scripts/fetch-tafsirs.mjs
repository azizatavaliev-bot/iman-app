// Fetches Tafsir Al-Saadi (Russian) from quran.com API for all 114 surahs.
// Output: scripts/tafsir-saadi.json — { "S:A": "text", ... }

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "tafsir-saadi.json");
const TAFSIR_ID = 170; // Russian Al-Sa'di
const BASE = `https://api.quran.com/api/v4/tafsirs/${TAFSIR_ID}/by_chapter`;

function stripHtml(s) {
  return String(s)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchChapter(n, attempt = 1) {
  const url = `${BASE}/${n}?per_page=300&page=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (attempt < 5) {
      const wait = 1000 * attempt;
      console.warn(`  retry ${attempt} for surah ${n} in ${wait}ms (${e.message})`);
      await new Promise((r) => setTimeout(r, wait));
      return fetchChapter(n, attempt + 1);
    }
    throw e;
  }
}

function expandKey(key, text, out) {
  // verse_key may be "S:A" or "S:A-B"
  const [sStr, aStr] = key.split(":");
  const s = Number(sStr);
  if (aStr.includes("-")) {
    const [from, to] = aStr.split("-").map(Number);
    for (let a = from; a <= to; a++) out[`${s}:${a}`] = text;
  } else {
    out[`${s}:${Number(aStr)}`] = text;
  }
}

async function main() {
  // Resume support: load existing if present
  let data = {};
  if (existsSync(OUT)) {
    try {
      data = JSON.parse(readFileSync(OUT, "utf8"));
      console.log(`Resuming with ${Object.keys(data).length} existing entries`);
    } catch {}
  }

  const doneSurahs = new Set();
  for (const k of Object.keys(data)) {
    doneSurahs.add(Number(k.split(":")[0]));
  }

  for (let n = 1; n <= 114; n++) {
    process.stdout.write(`Surah ${n}... `);
    const json = await fetchChapter(n);
    const entries = json.tafsirs || [];

    // Saadi groups consecutive ayahs into one commentary; the API returns full text
    // on the first ayah of the group and empty strings on the rest. Forward-fill so
    // every ayah in the group inherits the same commentary.
    let lastText = "";
    let lastBackfillFor = null; // if first entries are empty, queue them and fill backward
    const pending = [];
    for (const e of entries) {
      const text = stripHtml(e.text || "");
      if (text) {
        lastText = text;
        // Drain any pending leading-empties with this first non-empty text
        for (const p of pending) expandKey(p, text, data);
        pending.length = 0;
        expandKey(e.verse_key, text, data);
      } else if (lastText) {
        expandKey(e.verse_key, lastText, data);
      } else {
        // No previous non-empty yet — defer until we see one
        pending.push(e.verse_key);
      }
    }
    // Anything still pending means the entire surah was empty — leave it
    const surahKeys = Object.keys(data).filter((k) => k.startsWith(`${n}:`));
    console.log(`${entries.length} entries → ${surahKeys.length} ayahs covered`);

    writeFileSync(OUT, JSON.stringify(data));
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nDone. ${Object.keys(data).length} ayah entries written to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
