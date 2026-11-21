export type JsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: "too_large" | "invalid_json" | "missing_body" };

/** Read JSON with a hard byte limit, including requests without Content-Length. */
export async function readJsonBody(request: Request, maxBytes = 16_384): Promise<JsonBodyResult> {
  if (!request.body) return { ok: false, reason: "missing_body" };
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await request.body.cancel().catch(() => {});
    return { ok: false, reason: "too_large" };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  if (!total) return { ok: false, reason: "missing_body" };
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
