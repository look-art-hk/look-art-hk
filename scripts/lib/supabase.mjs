// 寫入 Supabase events 表（用 service key，只喺 GitHub Actions 入面用）
// 需要環境變數: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

export async function upsertEvents(rows, { purgeSlugs = [], log = console.log } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("缺 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  if (rows.length) {
    const res = await fetch(`${url}/rest/v1/events?on_conflict=slug`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error(`Supabase upsert ${res.status}: ${await res.text()}`);
    log(`Supabase upsert ${rows.length} rows`);
  }

  // 清走之前寫入、而家已被過濾規則剔走嘅項目
  if (purgeSlugs.length) {
    const list = purgeSlugs.map((s) => `"${s}"`).join(",");
    const res = await fetch(`${url}/rest/v1/events?slug=in.(${list})`, { method: "DELETE", headers });
    if (!res.ok) throw new Error(`Supabase purge ${res.status}: ${await res.text()}`);
    log(`Supabase purge ${purgeSlugs.length} excluded rows`);
  }
}
