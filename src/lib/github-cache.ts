export interface GitHubCacheOptions {
  origin: string;
}

/** Cache successful GitHub data, independently of SVG presentation options. */
export async function cachedGitHubData<T>(
  keyParts: unknown[],
  options: GitHubCacheOptions | undefined,
  load: () => Promise<T>,
): Promise<T> {
  if (!options) return load();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(keyParts)),
  );
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  // The token is hashed into the key so rotation cannot reuse data fetched with
  // different permissions. Neither the token nor API data is exposed by a route.
  const key = new Request(
    new URL(`/__github-data-cache/v1/${hash}`, options.origin),
  );
  let cache: Cache | undefined;
  try {
    cache = await caches.open("github-data-v1");
    const hit = await cache.match(key);
    if (hit) return await hit.json<T>();
  } catch {
    console.warn("GitHub cache lookup failed; fetching fresh data");
  }
  const data = await load(); // Rejections and partial results are never cached.
  if (cache) {
    try {
      await cache.put(
        key,
        Response.json(data, {
          headers: { "Cache-Control": "public, max-age=3600" },
        }),
      );
    } catch {
      console.warn("GitHub cache write failed");
    }
  }
  return data;
}
