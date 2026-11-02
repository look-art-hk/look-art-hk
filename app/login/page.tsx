"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch (e) {
      setError("登入失敗，請再試一次。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <h1 className="text-2xl" style={{ fontWeight: 700 }}>
        登入
      </h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        睇完，講你點睇。用 Google 帳號一鍵登入，毋需再用戶名密碼。
      </p>
      <button
        onClick={signInWithGoogle}
        disabled={loading}
        className="mt-6 w-full rounded-full border border-black/15 bg-white px-5 py-3 text-sm shadow-sm hover:bg-black/[0.03] disabled:opacity-50"
      >
        <span style={{ fontWeight: 700 }}>G</span>　用 Google 帳號繼續
      </button>
      {error && (
        <p className="mt-3 text-xs" style={{ color: "var(--pink)" }}>
          {error}
        </p>
      )}
      <p className="mt-8 text-xs leading-relaxed text-[color:var(--muted)]">
        留言會即刻公開，睇到其他人評論你的留言。網站有速率限制同檢舉制度，你亦可以隨時刪除自己的留言。
      </p>
    </div>
  );
}
