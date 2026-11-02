import Link from "next/link";
import { notFound } from "next/navigation";
import { events, getEvent, formatDateRange, type LookEvent } from "@/lib/events";
import { getLiveEvents, getLiveEvent } from "@/lib/live";
import MapShell from "@/components/MapShell";
import CommentSection from "@/components/CommentSection";

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // 先睇 static demo，搵唔到就由 Supabase 抓
  let e: LookEvent | undefined = getEvent(slug);
  if (!e) e = ((await getLiveEvent(slug)) ?? undefined) as LookEvent | undefined;
  if (!e) notFound();

  const others: LookEvent[] = [
    ...events.filter((o) => o.slug !== slug),
    ...((await getLiveEvents()) ?? []).filter((o) => o.slug !== slug && !events.some((s) => s.slug === o.slug)),
  ].slice(0, 6);

  return (
    <article className="mx-auto max-w-6xl px-5 py-10">
      <p className="text-sm">
        <Link href="/" className="text-[color:var(--muted)] hover:underline">
          ← 返回地圖
        </Link>
      </p>

      <header className="mt-4">
        <div className="flex items-center gap-2 text-xs">
          <span
            className="rounded-full px-2.5 py-0.5 font-bold text-white"
            style={{ background: "var(--purple)" }}
          >
            {e.category}
          </span>
          <span className="text-[color:var(--muted)]">
            {formatDateRange(e.startDate, e.endDate)}
          </span>
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl" style={{ fontWeight: 700 }}>
          {e.titleZh}
        </h1>
        <p className="mt-1 text-lg text-[color:var(--muted)]">{e.titleEn}</p>
      </header>

      <div className="mt-8 grid gap-8 md:grid-cols-5">
        <div className="md:col-span-3">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[color:var(--muted)]">場地</dt>
              <dd style={{ fontWeight: 700 }}>
                {e.venueZh}
                {e.venueEn && e.venueEn !== e.venueZh ? `（${e.venueEn}）` : ""}
              </dd>
              <dd className="text-[color:var(--muted)]">{e.addressZh}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--muted)]">票價</dt>
              <dd>{e.priceZh}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--muted)]">標籤</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {e.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-[#f0ecf8] px-2.5 py-0.5 text-xs"
                    style={{ color: "var(--purple)" }}
                  >
                    #{t}
                  </span>
                ))}
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-4">
            <p>{e.summaryZh}</p>
            <p className="text-sm text-[color:var(--muted)]">{e.summaryEn}</p>
          </div>

          <div className="mt-8">
            <CommentSection slug={slug} />
          </div>
        </div>

        <aside className="md:col-span-2">
          <div className="h-[320px] overflow-hidden rounded-2xl border border-black/10 shadow-sm">
            <MapShell events={[e]} activeSlug={slug} />
          </div>
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            地圖及位置資訊由 OpenStreetMap 提供。
          </p>

          <h3 className="mt-8 text-lg" style={{ fontWeight: 700 }}>
            同場活動
          </h3>
          <ul className="mt-3 space-y-3">
            {others.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/events/${o.slug}`}
                  className="block text-sm hover:underline"
                >
                  <span style={{ fontWeight: 700 }}>{o.titleZh}</span>
                  <br />
                  <span className="text-xs text-[color:var(--muted)]">
                    {o.venueZh}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </article>
  );
}
