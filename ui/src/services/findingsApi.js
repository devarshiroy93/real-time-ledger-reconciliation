import apiClient from "./apiClient";
// GET latest reconciliation results
export async function getFindings() {
    return apiClient("/findings");
}
// GET audit trail for one transaction
export async function getAudit(txId) {
    return apiClient(`/audit/${txId}`);
}
// Submit new customer transaction
export async function submitTransaction(txId, amount) {
    return apiClient("/transaction", {
        method: "POST",
        body: JSON.stringify({ txId, amount }),
    });
}
// Simulate processor settlement
export async function simulateProcessor(txId, amount) {
    return apiClient("/simulate/processor", {
        method: "POST",
        body: JSON.stringify({ txId, amount }),
    });
}
// Simulate core settlement
export async function simulateCore(txId, amount) {
    return apiClient("/simulate/core", {
        method: "POST",
        body: JSON.stringify({ txId, amount }),
    });
}
