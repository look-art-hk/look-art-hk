import Link from "next/link";
import { events, formatDateRange } from "@/lib/events";

export const metadata = {
  title: "活動檔案 — LOOK! ART HK",
};

// 檔案 = 每個檔期活動嘅永久紀錄。
// 目標：一年後返嚟，都可以喺度搵返「2026年11月 有咩展、有咩聲音」。
export default function ArchivePage() {
  const byYearMonth = new Map<string, typeof events>();
  for (const e of events) {
    const key = e.startDate.slice(0, 7); // YYYY-MM
    if (!byYearMonth.has(key)) byYearMonth.set(key, []);
    byYearMonth.get(key)!.push(e);
  }
  const months = [...byYearMonth.keys()].sort();

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-3xl" style={{ fontWeight: 700 }}>
        檔案
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[color:var(--muted)]">
        展覽會完，檔案唔會。呢度按月份紀錄每個收錄咗嘅活動，包括已完結嘅展期、場地、票價同當時嘅留言。正式版會自動由資料庫生成。
      </p>

      {months.map((m) => (
        <section key={m} className="mt-10">
          <h2 className="text-xl" style={{ fontWeight: 700 }}>
            {new Date(`${m}-01`).toLocaleDateString("zh-HK", {
              year: "numeric",
              month: "long",
            })}
          </h2>
          <ul className="mt-4 divide-y divide-black/10 border-y border-black/10">
            {byYearMonth.get(m)!.map((e) => (
              <li key={e.slug} className="py-3">
                <Link
                  href={`/events/${e.slug}`}
                  className="flex flex-wrap items-baseline gap-x-3 text-sm hover:underline"
                >
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                    style={{ background: "var(--purple)" }}
                  >
                    {e.category}
                  </span>
                  <span style={{ fontWeight: 700 }}>{e.titleZh}</span>
                  <span className="text-[color:var(--muted)]">{e.venueZh}</span>
                  <span className="text-xs text-[color:var(--muted)]">
                    {formatDateRange(e.startDate, e.endDate)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
