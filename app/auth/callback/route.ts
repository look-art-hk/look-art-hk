import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// 處理 Google 登入回跳：用 code 換 session，將 auth cookie
// 直接寫喺 redirect 回應上（確保瀏覽器收到），然後 redirect 返原頁。
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const response = NextResponse.redirect(`${origin}${next}`);

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}
