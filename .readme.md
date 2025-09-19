# Real-Time Ledger Reconciliation

Event-driven system that reconciles transactions across **Customer**, **Processor**, and **Core** ledgers in real time, detects mismatches, and surfaces them via a **Compliance Dashboard**.

---

## 🏦 Problem

In financial systems, different ledgers represent the same transaction:

- **Customer Ledger** → Real-time balance shown in app.  
- **Processor Ledger** → Visa/Mastercard/UPI settlement feeds.  
- **Core Ledger** → Bank’s audited double-entry system.  

These ledgers often diverge temporarily due to:
- Pending vs. settled status  
- FX adjustments, tips, rounding differences  
- Missing or duplicate settlements  
- Delays across payment networks  

**Goal:** Provide a real-time reconciliation engine with compliance observability.

---

## 🔄 Solution Overview

This project simulates real-time reconciliation:

1. **UI** → Create transaction.  
2. **Customer Ledger** → Transaction recorded as `PENDING`.  
3. **Processor Simulator** → Creates settlement record (slight variation possible).  
4. **Core Simulator** → Creates audited entry.  
5. **Reconciliation Engine** → Compares ledgers and logs results.  
6. **Compliance Dashboard** → Shows matched, mismatched, and pending counts.  

---

## 🗄️ Data Model (Simplified)

- **CustomerLedger** → `txId, amount, status, userId, createdAt`  
- **ProcessorLedger** → `txId, amount, status, processorRef, timestamp`  
- **CoreLedger** → `txId, amount, status, coreRef, timestamp`  
- **ReconciliationFindings** → `txId, expected vs actual, status, category, details`  
- **DailySummary** → `date, matchedCount, mismatchCount, pendingCount`  

---



