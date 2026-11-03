// M+ 博物館 → 特別展覽 → Supabase events 表
// 用法: node scripts/scrape-mplus.mjs [--dry-run]

import { decodeHtml, fetchText, isExcluded, ymd } from "./lib/common.mjs";
import { upsertEvents } from "./lib/supabase.mjs";

const LISTING_URL = "https://www.mplus.org.hk/tc/exhibitions/";
// M+ 位於西九文化區，OpenStreetMap 核實座標
const VENUE = { zh: "M+博物館", en: "M+", lat: 22.3009979, lng: 114.1591398, address: "香港西九龍文化區 文化道38號" };

export async function scrape({ log = console.error } = {}) {
  const html = await fetchText(LISTING_URL);
  const rows = [];
  const excludedSlugs = [];
  const seen = new Set();

  // 每張展覽卡係一個 <a href="/tc/exhibitions/<slug>/" class="CommonExhibitionsItem ...">
  const cards = html.matchAll(/<a href="\/tc\/exhibitions\/([^"]+?)\/?" class="CommonExhibitionsItem[^"]*"[\s\S]*?(?=<a href="\/tc\/exhibitions\/|$)/g);
  for (const m of cards) {
    const slugPart = m[1];
    const block = m[0];
    if (seen.has(slugPart)) continue;
    seen.add(slugPart);

    const label = decodeHtml(/CommonLabeledImage-label big"[^>]*>\s*([\s\S]*?)\s*<\/div>/.exec(block)?.[1] ?? "");
    if (!label.includes("特別展覽")) continue;

    const dates = [...block.matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)].map((x) => ymd(+x[1], +x[2], +x[3]));
    if (dates.length < 2) {
      log(`skip: [${slugPart}] 冇完整日期`);
      continue;
    }
    const title = decodeHtml(/CommonExhibitionsItem-bodyTitle[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/.exec(block)?.[1] ?? "");
    const gallery = decodeHtml(/CommonExhibitionsItem-bodyLocation[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/.exec(block)?.[1] ?? "");
    const slug = `mplus-${slugPart}`;

    if (isExcluded({ title, venue: VENUE.zh })) {
      excludedSlugs.push(slug);
      continue;
    }

    rows.push({
      slug,
      title_zh: title,
      title_en: title,
      venue_zh: gallery ? `${VENUE.zh}（${gallery}）` : VENUE.zh,
      venue_en: VENUE.en,
      address_zh: VENUE.address,
      category: "展覽",
      start_date: [...dates].sort()[0],
      end_date: [...dates].sort().slice(-1)[0],
      price_zh: "詳見 M+ 官網",
      lat: VENUE.lat,
      lng: VENUE.lng,
      summary_zh: null,
      summary_en: null,
      tags: ["M+"],
      source: "mplus",
      approved: true,
    });
    log(`ok: ${title} (${dates[0]}→${dates[1]})`);
  }
  return { rows, excludedSlugs };
}

const isMain = process.argv[1]?.endsWith("scrape-mplus.mjs");
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
