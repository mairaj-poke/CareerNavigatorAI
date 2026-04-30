const MAX_RETRIES = 2;

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);

      // success
      if (res.ok) return res;

      // don't retry client errors
      if (res.status >= 400 && res.status < 500) return res;

      lastError = new Error(`HTTP ${res.status}`);

    } catch (err) {
      // network error (THIS is important for Railway / mobile)
      lastError = err;
    }

    // retry delay
    if (attempt < retries) {
      await new Promise((r) =>
        setTimeout(r, Math.pow(2, attempt) * 500)
      );
    }
  }

  throw lastError;
}