const BASE_URL = import.meta.env.VITE_API_BASE_URL; // e.g. https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
const API_KEY = import.meta.env.VITE_API_KEY; // stored in .env.local
async function apiClient(path, options = {}) {
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
// ------------------------------
// ✅ Explicit API helpers
// ------------------------------
export async function submitApplication(body) {
    return apiClient("/transaction", {
        method: "POST",
        body: JSON.stringify(body),
    });
}
export async function getFindings() {
    return apiClient("/findings", { method: "GET" });
}
export async function getAudit(txId) {
    return apiClient(`/audit/${txId}`, { method: "GET" });
}
