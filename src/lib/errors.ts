// Supabase reports database problems as plain objects ({ message, details, hint, code }),
// not as Error instances, so `error instanceof Error ? error.message : "..."` hides the
// real reason behind a generic sentence. This turns any error into a readable message,
// with a plain-language explanation for the common causes and the technical text after it.

type ErrorLike = { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };

function explain(code: string, message: string): string | null {
  const text = message.toLowerCase();
  if (code === "42501" || text.includes("row-level security") || text.includes("permission denied")) {
    return "The database refused this change, which usually means your sign-in has expired. Please sign out, sign in again and retry.";
  }
  if (code === "PGRST301" || text.includes("jwt expired")) {
    return "Your sign-in has expired. Please sign out, sign in again and retry.";
  }
  if (code === "23505" || text.includes("duplicate key")) {
    return "That web address (slug) or reference code is already used by another item. Please choose a different one.";
  }
  if (code === "42703" || code === "PGRST204" || text.includes("could not find the") || text.includes("does not exist")) {
    return "The database is missing something this form needs. A database update (migration) may not have been applied yet.";
  }
  if (code === "23514" || text.includes("violates check constraint")) {
    return "One of the values is not allowed by the database.";
  }
  if (text.includes("failed to fetch") || text.includes("networkerror") || text.includes("network request failed")) {
    return "Could not reach the server. Please check your internet connection and try again.";
  }
  return null;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") return error.trim() || fallback;
  if (!error || typeof error !== "object") return fallback;

  const { message, details, hint, code } = error as ErrorLike;
  const technical = [message, details, hint]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join(" — ");
  if (!technical) return fallback;

  const friendly = explain(typeof code === "string" ? code : "", technical);
  const suffix = typeof code === "string" && code ? ` [${code}]` : "";
  return friendly ? `${friendly} (${technical}${suffix})` : `${technical}${suffix}`;
}
