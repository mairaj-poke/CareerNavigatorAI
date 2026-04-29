const MAX_RETRIES = 2;

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options);
    if (res.ok) return res;
    // Do not retry client errors (4xx) — they won't change on retry
    if (res.status >= 400 && res.status < 500) return res;
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500)); // 500ms, 1000ms
    } else {
      return res;
    }
  }
  // Unreachable but satisfies TS
  return fetch(url, options);
}
