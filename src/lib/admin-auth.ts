// Only allow redirecting to a path inside the admin area. Anything else
// (other sites, protocol-relative "//evil.com", backslash tricks) falls back
// to the admin home, so the ?next= parameter cannot be used as an open redirect.
export const ADMIN_HOME = "/admin";
export const LOGIN_PATH = "/studio-login";

export function safeNext(value: string | string[] | null | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return ADMIN_HOME;
  if (!/^\/admin(\/[A-Za-z0-9\-_.~/]*)?$/.test(candidate)) return ADMIN_HOME;
  if (candidate.includes("//") || candidate.includes("..")) return ADMIN_HOME;
  return candidate;
}
