// HK-AGA 展覽爬蟲 — 抓 hk-aga.org/exhibitions 全部會員展覽
// 用法: node scripts/scrape-hkaga.mjs --dry-run
// 寫入 DB 需要: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

const BASE = "https://www.hk-aga.org";
const UA = "LookArtHK-bot/0.1 (+https://look-art-hk.vercel.app; cultural event aggregator)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- 列表頁分析 ----------
// 每個 card:
//   <a href="/exhibitions/<id>" ...>
//     <div class="spans">CENTRAL</div>          ← 地區
//     <div class="tits fs30">標題</div>
//     <div class="times">5 Nov – 2 Jan, 2027</div>
//     <div class="texts">畫廊名</div>
function parseListing(html) {
  const items = [];
  const re = /<a href="\/exhibitions\/(\d+)"[\s\S]*?<\/a>/g;
  for (const m of html.matchAll(re)) {
    const block = m[0];
    const district = /<div class="spans">\s*([A-Z ()\/']+?)\s*<\/div>/.exec(block)?.[1] ?? null;
    const title = /<div class="tits[^"]*">\s*([\s\S]*?)\s*<\/div>/.exec(block)?.[1];
    const times = /<div class="times">\s*([\s\S]*?)\s*<\/div>/.exec(block)?.[1];
    // 畫廊名係第一個 <div class="texts">
    const texts = [...block.matchAll(/<div class="texts[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/div>/g)].map((x) => decode(x[1]));
    const venue = texts.length ? texts[0] : null;
    if (title) {
      items.push({
        source_id: Number(m[1]),
        district: district ? decode(district) : null,
        title_en: decode(title),
        dates_str: times ? decode(times) : null,
        venue_en: venue,
      });
    }
  }
  return items;
}

// ---------- 詳情頁分析 ----------
function parseDetail(id, html) {
  // 地址：Address:</b> 之後
  let address = /Address:\s*<\/b>\s*([\s\S]{10,200}?)<\/p>/i.exec(html)?.[1] ?? null;
  if (address) address = decode(address.replace(/<[^>]+>/g, " "));

  // 描述：所有 <p>，剔除 Address/Opening Hours 行
  let desc = null;
  const paras = [...html.matchAll(/<p>[\s\S]{60,2600}?<\/p>/g)]
    .map((x) => x[0])
    .map((p) => p.replace(/<[^>]+>/g, " "))
    .map(decode)
    .filter((t) =>
      !/^Address/i.test(t) &&
      !/^Opening Hours/i.test(t) &&
      !/^Email/i.test(t) &&
      !/^\d+\.\d+\.\d+$/.test(t)
    );
  if (paras.length) desc = paras.slice(0, 2).join(" ").slice(0, 900);

  return { address_en: address, description_en: desc };
}

// ---------- 日期 ----------
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

// "5 Nov – 2 Jan, 2027" | "29 Oct – 25 Nov, 2026" | "10 Oct – 21 Nov" (冇年份)
function parseDates(str) {
  if (!str) return { start: null, end: null };
  const m = str.match(/(\d{1,2})\s*([A-Za-z]{3,9}),?\s*(\d{4})?\s*[–—-]\s*(\d{1,2})\s*([A-Za-z]{3,9}),?\s*(\d{4})?/);
  if (!m) return { start: null, end: null };
  const [, d1, mo1, y1q, d2, mo2, y2q] = m;
  const mon1 = MONTHS[mo1.toLowerCase().slice(0, 3)];
  const mon2 = MONTHS[mo2.toLowerCase().slice(0, 3)];
  if (mon1 === undefined || mon2 === undefined) return { start: null, end: null };
  const y1 = y1q ? +y1q : new Date().getFullYear();
  let y2 = y2q ? +y2q : y1;
  if (!y2q && mon2 < mon1) y2 += 1; // 跨年
  const fmt = (d, mo, y) => new Date(Date.UTC(y, mo, +d)).toISOString().slice(0, 10);
  return { start: fmt(d1, mon1, y1), end: fmt(d2, mon2, y2) };
}

// ---------- 地址 → 座標（Nominatim / OpenStreetMap） ----------
// 香港大致 bounding box，用嚟剔走誤判外地 result
const HK_BBOX = { latMin: 22.1, latMax: 22.65, lngMin: 113.8, lngMax: 114.5 };

function inHK(p) {
  return (
    p?.lat >= HK_BBOX.latMin && p?.lat <= HK_BBOX.latMax &&
    p?.lng >= HK_BBOX.lngMin && p?.lng <= HK_BBOX.lngMax
  );
}

async function nominatim(q) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&q=" +
    encodeURIComponent(q);
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (res.status === 429 || res.status === 503 || res.status === 403) {
      await sleep(2500);
      continue;
    }
    if (!res.ok) return [];
    const arr = await res.json();
    return Array.isArray(arr) ? arr : [];
  }
  return [];
}

// 縮寫擴展：Rd. → Road，St. → Street（Nominatim 偏好全寫）
const expand = (q) =>
  q
    .replace(/\bRd\.?\b/g, "Road")
    .replace(/\bSt\.?\b/g, "Street")
    .replace(/\bSt\b(?= ),/g, "Street,")
    .replace(/,\s*\.\s*$/, "")
    .trim();

// 清潔地址：去 G/F、Shop、樓層前綴，加 "Hong Kong"
function cleanAddress(a) {
  return a
    .replace(/^(Shop\s*[\d\-A-Z]+,?\s*)/i, "")
    .replace(/^(Unit\s*[A-Z\d\-]+,?\s*)/i, "")
    .replace(/^(G\/F|\d+\/F|[A-Z]\/F),?\s*/i, "")
    .replace(/,\s*Hong\s*Kong\.?\s*$/i, "")
    .replace(/[\s\S]*Hong\s*Kong\.?$/, (m) => m) // 保留
    .replace(/[.]$/, "")
    .replace(/–|—/g, " ")
    .trim();
}

// 已知場地 override（地址 cleanup 救唔到嗰陣用；座標需可核實）
// 前兩個由 OpenStreetMap/Nominatim 街道查詢核實；E Tat 由 Google Maps 業務紀錄座標
const MANUAL = {
  "Vita Tower": { lat: 22.248541, lng: 114.164659 },
  "Hing Wai Centre": { lat: 22.248534, lng: 114.147323 },
  "E Tat Factory Building": { lat: 22.24872, lng: 114.16845 },
  // Barrack Block 喺 Tai Kwun 入面，用 Tai Kwun 中間座標（Nominatim 核實）
  "Barrack Block": { lat: 22.281945, lng: 114.154245 },
};

async function geocode(venue, address) {
  // 建立候選查詢清單：畫廊名 → 完整地址 → 逐段剝前綴
  const queries = [];
  if (venue) queries.push(`${venue}, Hong Kong`);
  let segs = [];
  if (address) {
    const cleaned = cleanAddress(address);
    queries.push(`${cleaned}, Hong Kong`);
    segs = cleaned.split(",").map((s) => s.trim()).filter(Boolean);
  }
  for (let n = 1; n <= 2 && segs.length > n + 1; n++) {
    queries.push(`${segs.slice(n).join(", ")}, Hong Kong`);
  }

  // manual overrides 優先
  if (address) {
    const key = Object.keys(MANUAL).find((k) => address.includes(k));
    if (key) return { ...MANUAL[key], via: `manual:${key}` };
  }

  for (const q of [...queries, ...queries.map(expand)]) {
    const arr = await nominatim(q);
    for (const hit of arr) {
      const p = { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
      if (inHK(p)) return { ...p, via: q };
    }
  }
  return null;
}

// ---------- 主流程 ----------
export async function scrape({ log = console.log } = {}) {
  // 1. 列表
  const listingHtml = await fetchText(BASE + "/exhibitions");
  const items = parseListing(listingHtml);
  log(`listing: ${items.length} exhibitions`);

  // 2. 詳情（地址 + 描述）
  for (const it of items) {
    const { start, end } = parseDates(it.dates_str);
    it.start_date = start;
    it.end_date = end;
    await sleep(700); // 禮貌抓取
    try {
      const html = await fetchText(`${BASE}/exhibitions/${it.source_id}`);
      const d = parseDetail(it.source_id, html);
      it.address_en = d.address_en;
      it.description_en = d.description_en;
      log(`ok: [${it.source_id}] ${it.title_en} @ ${it.venue_en ?? "?"}`);
    } catch (e) {
      log(`err: [${it.source_id}] ${e.message}`);
    }
  }

  // 3. 地址 → 座標（每個獨特地址只 lookup 一次）
  const cache = new Map();
  for (const it of items) {
    if (!it.address_en) { log(`geocode skip: [${it.source_id}] 冇地址`); continue; }
    if (cache.has(it.address_en)) {
      Object.assign(it, cache.get(it.address_en));
      continue;
    }
    await sleep(1300); // Nominatim 政策：最多 1 req/sec
    const g = await geocode(it.venue_en, it.address_en);
    if (g) {
      cache.set(it.address_en, { lat: g.lat, lng: g.lng });
      it.lat = g.lat;
      it.lng = g.lng;
      log(`geo ok: [${it.source_id}] ${it.address_en} → (${g.via.slice(0, 60)})`);
    } else {
      it.lat = null; it.lng = null;
      log(`geo fail: [${it.source_id}] ${it.address_en}`);
    }
  }

  // 4. 砍走完全冇座標又冇日期嘅
  return items;
}

// ---------- Supabase 寫入 ----------
async function upsertToSupabase(items, log = console.log) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("缺 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

  const now = new Date().toISOString().slice(0, 10);
  const rows = items
    .filter((it) => it.start_date && it.end_date)
    .filter((it) => it.end_date >= now) // 未完結先要 ← archive 都會 retain，所以全部 upsert，let DB 處理
    .map((it) => ({
      // 用 hkaga:<id> 做 slug 確保幂等
      slug: `hkaga-${it.source_id}`,
      title_zh: it.title_en,
      title_en: it.title_en,
      venue_zh: it.venue_en,
      venue_en: it.venue_en,
      address_zh: it.address_en,
      category: "展覽",
      start_date: it.start_date,
      end_date: it.end_date,
      price_zh: "免費入場（營業時間內）", // HKAGA 未有票價資料；Display 之後可以自訂
      lat: it.lat,
      lng: it.lng,
      summary_zh: it.description_en,
      summary_en: it.description_en,
      tags: it.district ? [it.district.toLowerCase()] : [],
      source: "scrape",
      approved: true,
    }));

  const res = await fetch(`${url}/rest/v1/events`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates", // upsert 主 slug
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  log(`Supabase upsert ${rows.length} rows`);
}

// ---------- CLI ----------
const isMain = process.argv[1]?.endsWith("scrape-hkaga.mjs");

function esc(s) {
  return String(s ?? "").replace(/'/g, "''");
}
function col(v) {
  return v === null || v === undefined ? "NULL" : `'${esc(v)}'`;
}

function generateSql(items) {
  const now = new Date().toISOString().slice(0, 10);
  const rows = items
    .filter((it) => it.start_date && it.end_date)
    .map((it) => {
      const tags = it.district ? [it.district.toLowerCase()] : [];
      return `  ('hkaga-${it.source_id}', '${esc(it.title_en)}', '${esc(it.title_en)}', '${esc(it.venue_en)}', '${esc(it.venue_en)}', '${esc(it.address_en)}', '展覽', '${it.start_date}', '${it.end_date}', '免費入場（營業時間內）', ${it.lat ?? "NULL"}, ${it.lng ?? "NULL"}, '${esc(it.description_en)}', '${esc(it.description_en)}', ARRAY[${tags.map(esc).map((t) => `'${t}'`).join(",")}]::text[], 'scrape', true)`;
    });
  return `-- LOOK! ART HK — HK-AGA 展覽種子（自動生成 ${now}）
-- 執行：Supabase → SQL Editor → Run
insert into public.events (slug, title_zh, title_en, venue_zh, venue_en, address_zh, category, start_date, end_date, price_zh, lat, lng, summary_zh, summary_en, tags, source, approved) values
${rows.join(",\n")}
on conflict (slug) do update set
  title_zh = excluded.title_zh,
  venue_zh = excluded.venue_zh,
  address_zh = excluded.address_zh,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  price_zh = excluded.price_zh,
  lat = excluded.lat,
  lng = excluded.lng,
  summary_zh = excluded.summary_zh,
  summary_en = excluded.summary_en,
  tags = excluded.tags,
  approved = excluded.approved;
`;
}

if (isMain) {
  scrape().then(async (items) => {
    if (process.argv.includes("--dry-run")) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }
    if (process.argv.includes("--sql")) {
      process.stdout.write(generateSql(items));
      return;
    }
    await upsertToSupabase(items);
    console.log("done");
  });
}
