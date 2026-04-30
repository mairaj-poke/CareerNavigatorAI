const MAX_RETRIES = 2;

export async function safeApiCall(url: string, options: RequestInit) {
  try {
    for (let i = 0; i <= MAX_RETRIES; i++) {
      const res = await fetch(url, options);

      if (res.ok) return await res.json();

      // ❌ Don't retry client errors
      if (res.status >= 400 && res.status < 500) {
        return null;
      }

      // ⏳ Retry with backoff
      if (i < MAX_RETRIES) {
        await new Promise((r) =>
          setTimeout(r, 500 * Math.pow(2, i))
        );
      }
    }

    return null;
  } catch (err) {
    console.log("API ERROR:", err);
    return null;
  }
}