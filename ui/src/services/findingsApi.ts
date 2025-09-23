import   apiClient from "./apiClient";

export interface Finding {
  txId: string;
  category: string;
  details: string;
  updatedAt: string;
}

export interface AuditEvent {
  txId: string;
  eventTimestamp: string;
  category: string;
  details: string;
}

// GET latest reconciliation results
export async function getFindings(): Promise<Finding[]> {
  return apiClient<Finding[]>("/findings");
}

// GET audit trail for one transaction
export async function getAudit(txId: string): Promise<AuditEvent[]> {
  return apiClient<AuditEvent[]>(`/audit/${txId}`);
}

// Submit new customer transaction
export async function submitTransaction(txId: string, amount: number) {
  return apiClient("/transaction", {
    method: "POST",
    body: JSON.stringify({ txId, amount }),
  });
}

// Simulate processor settlement
export async function simulateProcessor(txId: string, amount: number) {
  return apiClient("/simulate/processor", {
    method: "POST",
    body: JSON.stringify({ txId, amount }),
  });
}

// Simulate core settlement
export async function simulateCore(txId: string, amount: number) {
  return apiClient("/simulate/core", {
    method: "POST",
    body: JSON.stringify({ txId, amount }),
  });
}
