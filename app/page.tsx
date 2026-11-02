import Link from "next/link";
import { events, formatDateRange } from "@/lib/events";
import MapShell from "@/components/MapShell";

export default function Home() {
  return (
    <>
      <section
        className="text-white"
        style={{
          background:
            "linear-gradient(120deg, var(--blue) 0%, #2b46c8 60%, #5B2A86 100%)",
        }}
      >
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h1
            className="text-4xl md:text-5xl"
            style={{ fontFamily: "var(--font-montserrat)", fontWeight: 700 }}
          >
            LOOK! ART HK
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/85">
            香港文化藝術活動嘅交流平台、評論、地圖同檔案。
          </p>
          <p className="mt-2 text-2xl" style={{ fontWeight: 700 }}>
            睇完，你點睇？
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <h2 className="text-2xl" style={{ fontWeight: 700 }}>
          本週地圖
        </h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          示範資料：5 個真實場地 + 虛構展覽。點 pin 或者點列表睇詳情同留言。
        </p>
        <div className="mt-5 h-[440px] overflow-hidden rounded-2xl border border-black/10 shadow-sm">
          <MapShell events={events} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="text-2xl" style={{ fontWeight: 700 }}>
          全部活動
        </h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {events.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/events/${e.slug}`}
                className="block rounded-2xl border border-black/10 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
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
                <h3
                  className="mt-2 text-lg"
                  style={{ fontWeight: 700 }}
                >
                  {e.titleZh}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {e.venueZh} · {e.priceZh}
                </p>
                <p className="mt-2 line-clamp-2 text-sm">{e.summaryZh}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
