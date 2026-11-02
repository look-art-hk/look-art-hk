import { type LookEvent } from "@/lib/events";

// 由 Supabase events 表讀「已批准」活動（anon key + RLS）。
// 用喺 server components；fetch 有 1 小時 cache。
export async function getLiveEvents(): Promise<LookEvent[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/events?approved=eq.true&order=start_date.desc&limit=300`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows.map(rowToEvent);
  } catch {
    return null;
  }
}

export async function getLiveEvent(slug: string): Promise<LookEvent | null> {
  const live = await getLiveEvents();
  return live?.find((e) => e.slug === slug) ?? null;
}

function rowToEvent(r: Record<string, unknown>): LookEvent {
  return {
    slug: String(r.slug ?? ""),
    titleZh: String(r.title_zh ?? ""),
    titleEn: String(r.title_en ?? ""),
    venueZh: String(r.venue_zh ?? ""),
    venueEn: String(r.venue_en ?? ""),
    addressZh: String(r.address_zh ?? ""),
    category: (r.category as LookEvent["category"]) ?? "展覽",
    startDate: String(r.start_date ?? ""),
    endDate: String(r.end_date ?? ""),
    priceZh: String(r.price_zh ?? "免費入場（營業時間內）"),
    lat: (r.lat as number | null) ?? 22.2988,
    lng: (r.lng as number | null) ?? 114.1722,
    summaryZh: String(r.summary_zh ?? ""),
    summaryEn: String(r.summary_en ?? ""),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    demo: false,
  };
}
