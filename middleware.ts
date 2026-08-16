import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  return { url, anonKey };
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

export async function middleware(request: NextRequest) {
  try {
    let response = NextResponse.next({ request });
    const { url, anonKey } = getEnv();

    if (!url || !anonKey) {
      console.error("[middleware] Brak NEXT_PUBLIC_SUPABASE_URL / ANON_KEY");
      return response;
    }

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    const { pathname } = request.nextUrl;
    const isLoginPage = pathname === "/admin/login";
    const isProtected =
      pathname.startsWith("/admin") && pathname !== "/admin/login" && pathname !== "/admin";

    if (pathname === "/admin") {
      const target = request.nextUrl.clone();
      target.pathname = user ? "/admin/dashboard" : "/admin/login";
      const redirect = NextResponse.redirect(target);
      copyCookies(response, redirect);
      return redirect;
    }

    if (!user && isProtected) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("redirect", pathname);
      const redirect = NextResponse.redirect(loginUrl);
      copyCookies(response, redirect);
      return redirect;
    }

    if (user && isLoginPage) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/admin/dashboard";
      dashboardUrl.search = "";
      const redirect = NextResponse.redirect(dashboardUrl);
      copyCookies(response, redirect);
      return redirect;
    }

    return response;
  } catch (error) {
    console.error("[middleware] błąd:", error);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
