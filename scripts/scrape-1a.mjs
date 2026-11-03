// 1a space（牛棚藝術村）→ 展覽 → Supabase events 表
// 用法: node scripts/scrape-1a.mjs [--dry-run]
// 1a space 網站冇統一結構，所以用「標題行 + 獨立日期行」嘅規則抽取；dry-run 之後要睇一次結果

import { decodeHtml, fetchText, isExcluded } from "./lib/common.mjs";
import { upsertEvents } from "./lib/supabase.mjs";

const LISTING_URL = "https://www.oneaspace.org.hk/exhibition-2026";
// 牛棚藝術村，OpenStreetMap 核實座標
const VENUE = { zh: "1a space（牛棚藝術村）", en: "1a space, Cattle Depot Artist Village", lat: 22.320784, lng: 114.1910589, address: "九龍土瓜灣馬頭角道63號 牛棚藝術村 14號單位" };

// 獨立一行嘅日期範圍：07.03.2026 - 10.05.2026 / 10 – 15.06.2026
const FULL_DATE_LINE = /^(?:(\d{1,2})\.(\d{2})\.(\d{4})|(\d{1,2}))\s*[-–]\s*(\d{1,2})\.(\d{2})\.(\d{4})$/;
const pad = (n) => String(n).padStart(2, "0");

function parseDateLine(line) {
  const m = FULL_DATE_LINE.exec(line);
  if (!m) return null;
  const endY = +m[7];
  const endM = +m[6];
  const endD = +m[5];
  let start;
  if (m[1]) start = `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  else start = `${endY}-${pad(endM)}-${pad(m[4])}`;
  return { start, end: `${endY}-${pad(endM)}-${pad(endD)}` };
}

// 由日期行向上搵最近嘅標題行（跳過空白、零寬字、日期行）
function findTitle(lines, idx) {
  for (let i = idx - 1; i >= 0; i--) {
    const clean = lines[i].replace(/\u200b/g, "").trim();
    if (clean.length < 4) continue;
    if (parseDateLine(clean)) continue;
    if (/\||EXHIBITION|VENUE|DATE|Details|Opening|Free|ARTISTS|OPENING|SPONSORED|SPECIAL|Top of|Back|Exhibition Design|Technical|Created|^\d{4}\s*>?$|\bbottom of page\b|^[A-Z ]{3,}$/.test(clean)) continue;
    return clean;
  }
  return null;
}

export async function scrape({ log = console.error } = {}) {
  const html = await fetchText(LISTING_URL);
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/h\d>/g, "\n")
    .replace(/<[^>]+>/g, " ");
  const lines = text.split("\n").map((l) => decodeHtml(l));

  const rows = [];
  const excludedSlugs = [];
  const seen = new Set();

  lines.forEach((line, idx) => {
    const clean = line.replace(/\u200b/g, "").trim();
    const range = parseDateLine(clean);
    if (!range) return;
    const title = findTitle(lines, idx);
    if (!title) return;
    const slug = `1a-${title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${range.start}`;
    if (seen.has(slug)) return;
    seen.add(slug);

    if (isExcluded({ title, venue: VENUE.zh })) {
      excludedSlugs.push(slug);
      return;
    }
    rows.push({
      slug,
      title_zh: title,
      title_en: title,
      venue_zh: VENUE.zh,
      venue_en: VENUE.en,
      address_zh: VENUE.address,
      category: "展覽",
      start_date: range.start,
      end_date: range.end,
      price_zh: "免費入場",
      lat: VENUE.lat,
      lng: VENUE.lng,
      summary_zh: null,
      summary_en: null,
      tags: ["1a space"],
      source: "1a",
      approved: true,
    });
    log(`ok: ${title} (${range.start}→${range.end})`);
  });
  return { rows, excludedSlugs };
}

const isMain = process.argv[1]?.endsWith("scrape-1a.mjs");
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
