import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH } from "@/lib/admin-auth";

// Runs only on the studio (admin) routes, never on public pages, so visitors
// to the site are not slowed down.
//
// Why it exists: Supabase sessions use a short-lived access token (about an
// hour). Server Components cannot write cookies, so without this step an
// expired token is never renewed and the admin is bounced back to the login
// page after being idle. Here the token is refreshed and the new cookies are
// passed on to the page being rendered and to the browser.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const preventSessionCaching = (target: NextResponse) => {
    target.headers.set("Cache-Control", "private, no-store, max-age=0");
    target.headers.set("Pragma", "no-cache");
    target.headers.set("Expires", "0");
    return target;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return preventSessionCaching(response);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not run other code between createServerClient and getUser:
  // getUser() validates the session with Supabase and triggers the refresh.
  const { data: { user } } = await supabase.auth.getUser();

  // Authenticated responses may contain refreshed Supabase session cookies.
  // Never let a CDN or browser cache those responses for another visitor.
  preventSessionCaching(response);

  const { pathname } = request.nextUrl;
  if (!user && pathname.startsWith("/admin")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.search = "";
    if (pathname !== "/admin") loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    // Keep any cookies Supabase just cleared/refreshed.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return preventSessionCaching(redirect);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/studio-login"],
};
