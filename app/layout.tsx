import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LOOK! ART HK — 香港．睇．藝．術",
  description:
    "LOOK! ART HK 係香港文化藝術活動嘅交流平台、評論、地圖同檔案。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-HK"
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <a href="/" className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/look-art-hk-mark-c2.svg"
                alt="LOOK! ART HK 標誌"
                width={36}
                height={36}
              />
              <span
                className="text-lg tracking-wide text-[color:var(--color-purple)]"
                style={{ fontFamily: "var(--font-montserrat)", fontWeight: 700 }}
              >
                LOOK! ART HK
              </span>
            </a>
            <nav className="flex items-center gap-5 text-sm">
              <a href="/" className="hover:underline underline-offset-4">
                地圖
              </a>
              <a href="/archive" className="hover:underline underline-offset-4">
                檔案
              </a>
              <a
                href="/"
                className="rounded-full bg-[color:var(--color-purple)] px-4 py-1.5 text-white hover:opacity-90"
              >
                出版評論
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-12 border-t border-black/10 bg-[color:var(--color-blue)] text-white">
          <div className="mx-auto max-w-6xl px-5 py-8 text-sm">
            <p
              className="text-base"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 700 }}
            >
              睇完，你點睇？
            </p>
            <p className="mt-2 text-white/70">
              LOOK! ART HK 係香港文化藝術活動嘅交流平台、評論、地圖同檔案。
            </p>
            <p className="mt-4 text-xs text-white/50">
              展覽資料來源：HK-AGA（香港畫廊協會）會員畫廊官方網站，每日自動更新；標明「示範」嘅項目為示範資料。地圖底圖由 OpenStreetMap 提供。
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
