// Tai Kwun 大館 → 展覽（tag-exhibitions）→ Supabase events 表
// 用法: node scripts/scrape-taikwun.mjs [--dry-run]

import { decodeHtml, fetchText, isExcluded } from "./lib/common.mjs";
import { upsertEvents } from "./lib/supabase.mjs";

const LISTING_URL = "https://www.taikwun.hk/en/whats-on/exhibitions";
// 大館中心位置，OpenStreetMap 核實座標（各展廳共用）
const VENUE = { zh: "大館", en: "Tai Kwun", lat: 22.281945, lng: 114.154245, address: "香港中環荷李活道10號" };

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");

// "25 Sep 2026 – 3 Jan 2027" / "14 Oct – 14 Nov, 2026"
function parseRange(text) {
  const parts = text.split(/\s*[–-]\s*/);
  if (parts.length < 2) return null;
  const re = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*,?\s*(\d{4})?/;
  const l = re.exec(parts[0]);
  const r = re.exec(parts[1]);
  if (!l || !r) return null;
  const endYear = +(r[3] ?? l[3]);
  const startYear = +(l[3] ?? (MON[l[2].toLowerCase()] > MON[r[2].toLowerCase()] ? endYear - 1 : endYear));
  const s = `${startYear}-${pad(MON[l[2].toLowerCase()])}-${pad(+l[1])}`;
  const e = `${endYear}-${pad(MON[r[2].toLowerCase()])}-${pad(+r[1])}`;
  if (!MON[l[2].toLowerCase()] || !MON[r[2].toLowerCase()]) return null;
  return { start: s, end: e };
}

export async function scrape({ log = console.error } = {}) {
  const html = await fetchText(LISTING_URL);
  const rows = [];
  const excludedSlugs = [];
  const seen = new Set();

  // 每個活動係一個 .programme-detail；只收 tag-exhibitions 標籤嘅
  const blocks = html.split('<div class="programme-detail">').slice(1);
  for (const block of blocks) {
    if (!block.includes("tag-exhibitions")) continue;

    const link = /<h2><a href="([^"]+)">([\s\S]*?)<\/a><\/h2>/.exec(block);
    if (!link) continue;
    const url = link[1];
    const id = /\/(\d+)$/.exec(url)?.[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const title = decodeHtml(link[2]);
    const timeText = decodeHtml(/programme-property time">[\s\S]*?<\/i>([\s\S]*?)<\/span>/.exec(block)?.[1] ?? "");
    const venueText = decodeHtml(/programme-property venue">\s*<i class="tk tk-pin"><\/i>([\s\S]*?)<\/span>/.exec(block)?.[1] ?? "");
    const range = parseRange(timeText);
    const slug = `taikwun-${id}`;

    if (!range) {
      log(`skip: [${id}] 日期解析唔到: ${timeText}`);
      continue;
    }
    if (isExcluded({ title, venue: venueText })) {
      excludedSlugs.push(slug);
      continue;
    }

    rows.push({
      slug,
      title_zh: title,
      title_en: title,
      venue_zh: venueText ? `${VENUE.zh}（${venueText}）` : VENUE.zh,
      venue_en: venueText ? `${VENUE.en} (${venueText})` : VENUE.en,
      address_zh: VENUE.address,
      category: "展覽",
      start_date: range.start,
      end_date: range.end,
      price_zh: "詳見大館官網",
      lat: VENUE.lat,
      lng: VENUE.lng,
      summary_zh: null,
      summary_en: null,
      tags: ["大館"],
      source: "taikwun",
      approved: true,
    });
    log(`ok: [${id}] ${title} (${range.start}→${range.end})`);
  }
  return { rows, excludedSlugs };
}

const isMain = process.argv[1]?.endsWith("scrape-taikwun.mjs");
if (isMain) {
  scrape().then(async ({ rows, excludedSlugs }) => {
    if (process.argv.includes("--dry-run")) {
      console.log(JSON.stringify({ rows, excludedSlugs }, null, 2));
      return;
    }
    await upsertEvents(rows, { purgeSlugs: excludedSlugs });
    console.log("done");
  });
}
