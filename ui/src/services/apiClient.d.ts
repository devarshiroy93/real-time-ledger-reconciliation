declare function apiClient<T>(path: string, options?: RequestInit): Promise<T>;
export default apiClient;
export declare function submitApplication(body: {
    txId: string;
    amount: number;
}): Promise<unknown>;
export declare function getFindings(): Promise<unknown>;
export declare function getAudit(txId: string): Promise<unknown>;
