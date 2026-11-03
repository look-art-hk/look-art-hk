// 各 scraper 共用工具

export const UA = "LookArtHK-bot/0.1 (+https://look-art-hk.vercel.app; cultural event aggregator)";

// HK 大致 bounding box，剔走明顯錯誤嘅座標
const HK_BBOX = { latMin: 22.1, latMax: 22.65, lngMin: 113.8, lngMax: 114.5 };

export function inHK(lat, lng) {
  return lat >= HK_BBOX.latMin && lat <= HK_BBOX.latMax && lng >= HK_BBOX.lngMin && lng <= HK_BBOX.lngMax;
}

export async function fetchText(url, accept = "text/html") {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export const pad = (n) => String(n).padStart(2, "0");
export const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// 只要展覽：電影節目同劇場／表演場地一律剔走
const FILM_RE = /電影|影展|影禮|放映|\bfilm\b|cinema/i;
const THEATRE_RE = /劇院|劇場|theatre|theater/i;

export function isExcluded({ title = "", venue = "" }) {
  return FILM_RE.test(title) || THEATRE_RE.test(venue);
}

export function decodeHtml(s) {
  return s
    .replace(/&ndash;|&#8211;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&euml;/g, "ë")
    .replace(/&eacute;/g, "é")
    .replace(/\s+/g, " ")
    .trim();
}
