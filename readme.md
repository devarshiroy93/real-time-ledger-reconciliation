# 📘 Real-Time Ledger Reconciliation POC

---

##  Objective
This project demonstrates a **real-time ledger reconciliation engine** using **AWS DynamoDB, Lambda, and API Gateway**.

- Simulate **3 ledgers**:
  - **CustomerLedger** → customer-facing status (`PENDING` → `SETTLED`).
  - **ProcessorLedger** → Visa/Mastercard settlement feed.
  - **CoreLedger** → bank’s audited ledger of record.
- A **Reconciliation Engine**:
  - Collects versions of each transaction.
  - Compares them and classifies into ✅ MATCHED, ❌ MISMATCH, or ⏳ PENDING.
  - Updates **CustomerLedger** when appropriate.
  - Writes results into:
    - **ReconciliationFindings** → latest state (for ops dashboard).
    - **ReconciliationAudit** → full lifecycle trail (for compliance/audit).

---

##  Architecture

```text
             ┌───────────────┐
             │   Frontend UI │
             └───────┬───────┘
                     │
         (REST APIs via API Gateway)
 ┌───────────────────┼──────────────────────┐
 │                   │                      │
 ▼                   ▼                      ▼
SubmitTransaction   ProcessorSimulator     CoreSimulator
   Lambda              Lambda                Lambda
   │                   │                      │
   ▼                   ▼                      ▼
CustomerLedger   ProcessorLedger         CoreLedger
   (txId)        (txId + timestamp)     (txId + timestamp)
       └─────────────┬───────────────┬─────────────┘
                     ▼
        ReconciliationEngine Lambda
                     │
        ┌────────────┴─────────────┐
        ▼                          ▼
ReconciliationFindings      ReconciliationAudit
 (latest state)             (full lifecycle trail)
```

---

##  DynamoDB Tables

| Table                     | PK       | SK               | Purpose |
|---------------------------|----------|------------------|---------|
| **CustomerLedger**        | `txId`   | –                | Customer view of transactions. |
| **ProcessorLedger**       | `txId`   | `timestamp`      | Settlement events from processor. |
| **CoreLedger**            | `txId`   | `timestamp`      | Bank’s core ledger entries. |
| **ReconciliationFindings**| `txId`   | –                | **Latest reconciliation result** per transaction. |
| **ReconciliationAudit**   | `txId`   | `eventTimestamp` | **Full lifecycle trail** of states. |
| **DailySummary**          | `date`   | –                | Aggregated stats (future use). |

---

##  Lambdas

| Lambda                  | API / Trigger              | Role |
|--------------------------|----------------------------|------|
| **SubmitTransaction**   | `POST /transaction`        | Creates `PENDING` transaction in CustomerLedger (idempotent). |
| **ProcessorSimulator**  | `POST /simulate/processor` | Simulates processor feed → ProcessorLedger. |
| **CoreSimulator**       | `POST /simulate/core`      | Simulates core feed → CoreLedger. |
| **ReconciliationEngine**| DynamoDB Streams           | Reconciles transactions, updates CustomerLedger, writes to Findings + Audit. |

---

## 🚦 Reconciliation Logic

1. **Pending**  
   - Only customer entry exists → `PENDING ⏳`.

2. **Missing entry**  
   - Processor or Core missing → `MISMATCH ❌ Missing …`.

3. **Duplicate settlement**  
   - More than one processor/core entry → `MISMATCH ❌ Duplicate settlement`.

4. **FX adjustment**  
   - Amounts differ slightly (≤ 1) → `MISMATCH ❌ FX Adjustment`.

5. **Matched**  
   - All ledgers agree, Customer = `SETTLED` → `MATCHED ✅`.

---

##  Demo Flow

```bash
# 1. Submit transaction
curl -X POST https://<api>/transaction   -H "Content-Type: application/json"   -d '{"txId":"tx1001","amount":101}'

# 2. Simulate processor settlement
curl -X POST https://<api>/simulate/processor   -H "Content-Type: application/json"   -d '{"txId":"tx1001","amount":101}'

# 3. Simulate core settlement
curl -X POST https://<api>/simulate/core   -H "Content-Type: application/json"   -d '{"txId":"tx1001","amount":101}'
```

**Observe:**
- **CustomerLedger** flips `PENDING → SETTLED`.  
- **ReconciliationAudit** logs the trail: `PENDING ⏳ → MISMATCH ❌ (missing core) → MATCHED ✅`.  
- **ReconciliationFindings** shows only the **latest state**: `MATCHED ✅`.

---


## 🏦 Real-World Banking Challenges Addressed

This POC highlights challenges real financial institutions face when reconciling distributed ledgers:

- **Ledger Fragmentation**  
  Multiple systems of record (customer-facing apps, processors, and core banking ledgers) often diverge in timing and amounts.  
  → *ReconciliationEngine continuously compares and aligns them.*

- **Operational Risk**  
  Manual reconciliation is slow and error-prone, increasing financial + compliance risk.  
  → *Automation reduces ops overhead and human error.*

- **Discrepancy Categories**  
  Differences may be caused by FX adjustments, duplicates, missing settlements, or pending states.  
  → *Engine explicitly categorizes these for faster resolution.*

- **Auditability & Compliance**  
  Regulators require a provable trail of all changes.  
  → *ReconciliationAudit table provides an immutable lifecycle log.*

- **Scalability**  
  Payment volumes are high; systems must handle streaming updates and bursts.  
  → *DynamoDB Streams + Lambdas enable elastic scaling with no polling.*

---
## 📂 Repository Structure

```text
real-time-ledger-reconciliation/
│── infra/                 # CDK infra (tables, lambdas, apis)
│── lambdas/               # Lambda sources
│   ├── submit-transaction/
│   ├── processor-simulator/
│   ├── core-simulator/
│   └── reconciliation-engine/
│── ui/                    # React dashboard (future)
│── scripts/               # Demo helper scripts
│── tests/                 # Unit/integration tests
│── README.md
```

---
---

## 🔎 Observability & Resilience (Future Enhancements)

- **Monitoring**  
  Add CloudWatch custom metrics for reconciliation categories  
  (`MATCHED ✅`, `MISMATCH ❌`, `PENDING ⏳`).

- **Dashboards**  
  Build CloudWatch dashboards or Grafana panels to visualize reconciliation  
  trends over time (e.g., daily mismatch ratio).

- **Retries**  
  Configure Dead-Letter Queues (SQS) for failed Lambda events to avoid  
  silent data loss and enable replay.

- **Alarms**  
  Use CloudWatch Alarms + SNS notifications for:  
  - High mismatch/error rates  
  - Lambda failures or throttles  
  - API Gateway 5xx spikes  

- **Tracing**  
  Enable AWS X-Ray (or OpenTelemetry) for end-to-end latency tracking,  
  root-cause analysis, and debugging across Lambdas + API Gateway.

---
