import tafsirData from "./tafsir-saadi.json";

export const TAFSIR_SOURCE = "Тафсир ас-Саади";

export interface TafsirEntry {
  surah: number;
  ayah: number;
  text: string;
}

const RAW: Record<string, string> = tafsirData as Record<string, string>;

export function getTafsir(surah: number, ayah: number): TafsirEntry | null {
  const text = RAW[`${surah}:${ayah}`];
  if (!text) return null;
  return { surah, ayah, text };
}

export function hasTafsirForAyah(surah: number, ayah: number): boolean {
  return Boolean(RAW[`${surah}:${ayah}`]);
}

export function hasTafsir(surah: number): boolean {
  const prefix = `${surah}:`;
  for (const k in RAW) if (k.startsWith(prefix)) return true;
  return false;
}

export function getSurahTafsir(surah: number): TafsirEntry[] {
  const prefix = `${surah}:`;
  const result: TafsirEntry[] = [];
  for (const k in RAW) {
    if (!k.startsWith(prefix)) continue;
    const ayah = Number(k.slice(prefix.length));
    result.push({ surah, ayah, text: RAW[k] });
  }
  result.sort((a, b) => a.ayah - b.ayah);
  return result;
}

export function getTafsirBySurah(surah: number): TafsirEntry[] {
  return getSurahTafsir(surah);
}

export function getSurahsWithTafsir(): number[] {
  const surahs = new Set<number>();
  for (const k in RAW) surahs.add(Number(k.split(":", 1)[0]));
  return Array.from(surahs).sort((a, b) => a - b);
}

export function getTafsirCount(): number {
  return Object.keys(RAW).length;
}
