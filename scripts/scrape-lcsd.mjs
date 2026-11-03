// 康文署（LCSD）開放數據 → 展覽活動 → Supabase events 表
// 用法: node scripts/scrape-lcsd.mjs [--dry-run]

import { fetchText, inHK, isExcluded } from "./lib/common.mjs";
import { upsertEvents } from "./lib/supabase.mjs";

const EVENTS_URL = "https://www.lcsd.gov.hk/datagovhk/event/events.xml";
const VENUES_URL = "https://www.lcsd.gov.hk/datagovhk/event/venues.xml";

// 展覽子類別：inc4sc4 表演藝術下嘅展覽、inc6sc1 博物館展覽、inc7sc3 圖書館展覽
const EXHIBITION_CATS = new Set(["inc4sc4", "inc6sc1", "inc7sc3"]);

function unwrap(s) {
  const m = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(s);
  return (m ? m[1] : s).trim();
}

// 攞單一 tag 文字，例如 <titlec><![CDATA[...]]></titlec>
function tag(block, name) {
  const m = new RegExp(`<${name}\\b[^>]*?(?:/>|>([\\s\\S]*?)</${name}>)`).exec(block);
  return m && m[1] !== undefined ? unwrap(m[1]) : "";
}

function parseEvents(xml) {
  const items = [];
  for (const m of xml.matchAll(/<event id="(\d+)">([\s\S]*?)<\/event>/g)) {
    const b = m[2];
    items.push({
      id: m[1],
      titlec: tag(b, "titlec"),
      titlee: tag(b, "titlee"),
      cat2: tag(b, "cat2"),
      predateC: tag(b, "predateC"),
      venueid: tag(b, "venueid"),
      pricec: tag(b, "pricec"),
      descc: tag(b, "descc"),
      desce: tag(b, "desce"),
    });
  }
  return items;
}

function parseVenues(xml) {
  const map = new Map();
  for (const m of xml.matchAll(/<venue id="(\d+)">([\s\S]*?)<\/venue>/g)) {
    const b = m[2];
    const lat = parseFloat(tag(b, "latitude"));
    const lng = parseFloat(tag(b, "longitude"));
    map.set(m[1], {
      venuec: tag(b, "venuec"),
      venuee: tag(b, "venuee"),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    });
  }
  return map;
}

// 日期解析：抽晒所有 dd/mm/yyyy（或 dd.mm.yyyy、dd-dd/mm/yyyy）嘅日期，取最早同最遲
const DATE_RE = /(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s*[/.]\s*(\d{1,2})\s*[/.]\s*(\d{4})/g;

function parseDates(s) {
  const dates = [];
  for (const m of s.matchAll(DATE_RE)) {
    const y = +m[4];
    const mo = +m[3];
    dates.push(`${y}-${String(mo).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`);
    if (m[2]) dates.push(`${y}-${String(mo).padStart(2, "0")}-${String(+m[2]).padStart(2, "0")}`);
  }
  if (!dates.length) return { start: null, end: null };
  dates.sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

export async function scrape({ log = console.error } = {}) {
  const [eventsXml, venuesXml] = await Promise.all([fetchText(EVENTS_URL, "application/xml"), fetchText(VENUES_URL, "application/xml")]);
  const venues = parseVenues(venuesXml);
  const all = parseEvents(eventsXml);
  log(`lcsd: ${all.length} events, ${venues.size} venues`);

  const rows = [];
  const excludedSlugs = [];
  for (const e of all) {
    if (!EXHIBITION_CATS.has(e.cat2)) continue;
    const v = venues.get(e.venueid);
    const slug = `lcsd-${e.id}`;
    if (isExcluded({ title: e.titlec, venue: v?.venuec ?? "" })) {
      excludedSlugs.push(slug);
      log(`exclude: [${e.id}] ${e.titlec}`);
      continue;
    }
    const { start, end } = parseDates(e.predateC);
    if (!start || !end) {
      log(`skip: [${e.id}] 日期解析唔到`);
      continue;
    }
    const inside = v?.lat != null && inHK(v.lat, v.lng);
    rows.push({
      slug,
      title_zh: e.titlec,
      title_en: e.titlee || e.titlec,
      venue_zh: v?.venuec ?? "",
      venue_en: v?.venuee ?? "",
      address_zh: null,
      category: "展覽",
      start_date: start,
      end_date: end,
      price_zh: e.pricec || "詳見主辦機構",
      lat: inside ? v.lat : null,
      lng: inside ? v.lng : null,
      summary_zh: e.descc || null,
      summary_en: e.desce || null,
      tags: ["康文署"],
      source: "lcsd",
      approved: true,
    });
    log(`ok: [${e.id}] ${e.titlec} @ ${v?.venuec ?? "?"} (${start}→${end})`);
  }
  return { rows, excludedSlugs };
}

const isMain = process.argv[1]?.endsWith("scrape-lcsd.mjs");
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
