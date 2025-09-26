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
export declare function getFindings(): Promise<Finding[]>;
export declare function getAudit(txId: string): Promise<AuditEvent[]>;
export declare function submitTransaction(txId: string, amount: number): Promise<any>;
export declare function simulateProcessor(txId: string, amount: number): Promise<any>;
export declare function simulateCore(txId: string, amount: number): Promise<any>;
