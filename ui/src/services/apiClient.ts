const BASE_URL = import.meta.env.VITE_API_BASE_URL;   // e.g. https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
const API_KEY = import.meta.env.VITE_API_KEY;         // stored in .env.local

async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

export default apiClient;
