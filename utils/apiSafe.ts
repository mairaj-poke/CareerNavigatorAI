import { fetchWithRetry } from "./api";

export async function safeApiCall(url: string, options: RequestInit) {
  try {
    const res = await fetchWithRetry(url, options);

    if (!res) {
      console.warn("No response from API:", url);
      return null;
    }

    if (!res.ok) {
      console.warn("API error:", url, res.status);

      // still try to return JSON error safely
      try {
        return await res.json();
      } catch {
        return null;
      }
    }

    return await res.json();
  } catch (err) {
    console.warn("Backend unreachable:", err);
    return null; // 🔥 IMPORTANT: prevents app crash
  }
}