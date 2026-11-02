"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface Comment {
  id: number;
  user_name: string;
  created_at: string;
  body: string;
  user_id: string;
}

// 示範留言（未有真實留言之前照樣顯示，標明示範）
const demoComments: Record<string, { author: string; date: string; text: string }[]> = {
  "neon-city-archive": [
    { author: "阿 Ken", date: "2026/10/30", text: "師傅口述嗰段最打動我。我細個屋企樓下嗰塊招牌原來有份喺展入面。" },
    { author: "yuki_hk", date: "2026/10/31", text: "The wall of sign drafts is worth the $60 alone. Draftsmanship is crazy." },
  ],
  "ink-everyday": [
    { author: "林太", date: "2026/10/29", text: "「墟」嗰個章節好親切，啲壁畫同我小時候返學嘅路段好似。" },
  ],
  "field-sculpture": [
    { author: "周小姐", date: "2026/10/28", text: "喺洗衣場石階嗰件作品由上向下望先至見到全部，地圖嗰個指引幫到手。" },
    { author: "Alvin", date: "2026/10/30", text: "Site-specific pieces really land differently once you know the prison history. Free entry too." },
  ],
  "listening-practice": [
    { author: "匿名", date: "2026/10/27", text: "借耳機聽早茶樓嗰段，好似隔籬座位阿伯嘅收音機。聽完忽然好想飲茶。" },
  ],
  "small-room-drawing": [
    { author: "gallery_hopper", date: "2026/11/01", text: "畫布尺寸嘅想法有趣，但成個展好似得 8 張畫，想睇多啲。" },
  ],
};

const REPORT_HIDE_THRESHOLD = 5; // 呢個數字嘅舉報就自動隱藏

export default function CommentSection({ slug }: { slug: string }) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadSession() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setSessionLoaded(true);
  }

  async function loadComments() {
    const { data, error } = await supabase
      .from("comments")
      .select("id, user_id, user_name, body, created_at")
      .eq("event_slug", slug)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(100);
    setComments(error ? [] : (data ?? []));
  }

  React.useEffect(() => {
    loadSession();
    loadComments();
    const { data: sub } = supabase.auth.onAuthStateChange(() => loadSession());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!text.trim()) return;

    if (!session) {
      setNotice("請先喺上方登入。");
      return;
    }

    // 速率限制：5 分鐘內最多 1 條留言（app 級檢查；正式再收緊）
    const { data: recent } = await supabase
      .from("comments")
      .select("created_at")
      .eq("user_id", session.user.id)
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());
    if (recent && recent.length > 0) {
      setNotice("5 分鐘之內已經有留言，請稍候再發（速率限制）。");
      return;
    }

    setSending(true);
    const userName =
      session.user.user_metadata?.full_name ??
      session.user.user_metadata?.name ??
      session.user.email ??
      "匿名";

    const { data, error } = await supabase
      .from("comments")
      .insert({
        event_slug: slug,
        user_id: session.user.id,
        user_name: userName,
        body: text.trim(),
      })
      .select()
      .single();
    setSending(false);

    if (error) {
      setNotice(`發表失敗：${error.message}`);
      return;
    }
    setText("");
    if (data) setComments([data as Comment, ...(comments ?? [])]);
  }

  async function remove(id: number) {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (!error) setComments((comments ?? []).filter((c) => c.id !== id));
    else setNotice(`刪除失敗：${error.message}`);
  }

  async function report(id: number) {
    if (!session) {
      setNotice("要登入先可以舉報留言。");
      return;
    }
    // 用 RPC：計入 report_count，達到門檻自動隱藏
    const { error } = await supabase.rpc("report_comment", { c_id: id });
    if (error) {
      setNotice(`舉報失敗：${error.message}`);
      return;
    }
    setNotice("已收到舉報。多過 " + REPORT_HIDE_THRESHOLD + " 個人舉報就會自動隱藏。");
    loadComments();
  }

  function fireEventDate(iso: string) {
    return new Date(iso).toLocaleDateString("zh-HK");
  }

  return (
    <section className="rounded-2xl border border-black/10 p-5 shadow-sm">
      <h2 className="text-xl" style={{ fontWeight: 700 }}>
        留言（{comments ? comments.length : "…"}）
      </h2>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        睇完？講下你點睇。留言即刻公開。
      </p>

      {sessionLoaded && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          {session ? (
            <>
              <span>
                而家登入：<b>{session.user.user_metadata?.name ?? session.user.email}</b>
              </span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs underline underline-offset-4 text-[color:var(--muted)]"
              >
                登出
              </button>
            </>
          ) : (
            <>
              <span className="text-[color:var(--muted)]">未登入</span>
              <a
                href="/login"
                className="rounded-full bg-[color:var(--purple)] px-4 py-1.5 text-xs text-white"
              >
                Google 登入
              </a>
            </>
          )}
        </div>
      )}

      <ul className="mt-4 space-y-4">
        {(comments ?? []).map((c) => (
          <li key={c.id} className="rounded-xl bg-[#f7f6f3] p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm" style={{ fontWeight: 700 }}>
                {c.user_name}
              </span>
              <span className="text-xs text-[color:var(--muted)]">
                {fireEventDate(c.created_at)}
              </span>
            </div>
            <p className="mt-1.5 text-sm whitespace-pre-wrap">{c.body}</p>
            <div className="mt-2 flex gap-3 text-xs text-[color:var(--muted)]">
              {session?.user.id === c.user_id && (
                <button
                  onClick={() => remove(c.id)}
                  className="underline underline-offset-4 hover:text-[color:var(--pink)]"
                >
                  刪除
                </button>
              )}
              <button
                onClick={() => report(c.id)}
                className="underline underline-offset-4 hover:text-[color:var(--pink)]"
              >
                舉報
              </button>
            </div>
          </li>
        ))}

        {/* 示範留言 */}
        {(demoComments[slug] ?? []).map((c, i) => (
          <li key={`demo-${i}`} className="rounded-xl border border-dashed border-black/15 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm" style={{ fontWeight: 700 }}>
                {c.author}
                <span className="ml-1 rounded bg-black/10 px-1.5 py-0.5 text-[10px] align-middle">示範</span>
              </span>
              <span className="text-xs text-[color:var(--muted)]">{c.date}</span>
            </div>
            <p className="mt-1.5 text-sm whitespace-pre-wrap">{c.text}</p>
          </li>
        ))}
      </ul>

      {notice && (
        <p className="mt-3 text-xs" style={{ color: "var(--pink)" }}>
          {notice}
        </p>
      )}

      <form onSubmit={submit} className="mt-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={session ? "你點睇？（中文或者英文都得）" : "先登入再留言"}
          disabled={!session}
          className="w-full rounded-xl border border-black/15 p-3 text-sm disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-[color:var(--muted)]">
            {session
              ? "5 分鐘之內最多 1 條留言。"
              : "留言需要 Google 登入。"}
          </span>
          <button
            type="submit"
            disabled={!session || sending}
            className="rounded-full bg-[color:var(--purple)] px-5 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {sending ? "發送中…" : "發表"}
          </button>
        </div>
      </form>
    </section>
  );
}
