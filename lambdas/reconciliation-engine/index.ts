import {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({});

// Table names from env
const CUSTOMER_TABLE = process.env.CUSTOMER_LEDGER_TABLE!;
const PROCESSOR_TABLE = process.env.PROCESSOR_LEDGER_TABLE!;
const CORE_TABLE = process.env.CORE_LEDGER_TABLE!;
const FINDINGS_TABLE = process.env.FINDINGS_TABLE!;
const AUDIT_TABLE = process.env.AUDIT_TABLE!;

export const handler = async (event: any) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    if (record.eventName !== "INSERT") continue;

    const txId = record.dynamodb.Keys.txId.S;
    console.log(`Reconciling txId: ${txId}`);

    // --- Gather entries ---
    const customerEntries = await getLedgerEntries(CUSTOMER_TABLE, txId);
    const processorEntries = await getLedgerEntries(PROCESSOR_TABLE, txId);
    const coreEntries = await getLedgerEntries(CORE_TABLE, txId);

    const customer = customerEntries[0] ?? null; // expect 1

    // --- Flip CustomerLedger to SETTLED once processor entry exists ---
    if (customer && processorEntries.length > 0 && customer.status === "PENDING") {
      try {
        await ddb.send(
          new UpdateItemCommand({
            TableName: CUSTOMER_TABLE,
            Key: { txId: { S: customer.txId } },
            UpdateExpression: "SET #s = :s",
            ExpressionAttributeNames: { "#s": "status" },
            ConditionExpression: "#s = :pending", // only if still PENDING
            ExpressionAttributeValues: {
              ":s": { S: "SETTLED" },
              ":pending": { S: "PENDING" },
            },
          })
        );
        console.log(`CustomerLedger updated to SETTLED for ${txId}`);
        customer.status = "SETTLED"; // reflect locally
      } catch (err: any) {
        if (err.name === "ConditionalCheckFailedException") {
          console.log(`CustomerLedger already updated for ${txId}`);
        } else {
          console.error("CustomerLedger update error", err);
          throw err;
        }
      }
    }

    // --- Decide outcome ---
    const { category, details } = decideOutcome(customer, processorEntries, coreEntries);
    const now = new Date().toISOString();

    // --- Write to Audit (append-only) ---
    await ddb.send(
      new PutItemCommand({
        TableName: AUDIT_TABLE,
        Item: {
          txId: { S: txId },
          eventTimestamp: { S: now },
          category: { S: category },
          details: { S: details },
        },
      })
    );
    console.log(`Audit log written for ${txId}: ${category}`);

    // --- Write to Findings (latest state only, overwrite) ---
    await ddb.send(
      new PutItemCommand({
        TableName: FINDINGS_TABLE,
        Item: {
          txId: { S: txId },
          category: { S: category },
          details: { S: details },
          updatedAt: { S: now },
        },
      })
    );
    console.log(`Findings updated for ${txId}: ${category}`);
  }
};

// --- Helpers ---
async function getLedgerEntries(table: string, txId: string) {
  const res = await ddb.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: "txId = :t",
      ExpressionAttributeValues: { ":t": { S: txId } },
    })
  );
  const items = res.Items?.map((i) => unmarshall(i)) ?? [];
  console.log(`DEBUG: ${table} returned ${items.length} items for txId=${txId}`);
  return items;
}

// Reconciliation logic
function decideOutcome(customer: any, processorEntries: any[], coreEntries: any[]) {
  let category = "PENDING ⏳";
  let details = "Waiting for more ledger entries.";

  if (processorEntries.length > 1) {
    category = "MISMATCH ❌";
    details = "Duplicate settlement in ProcessorLedger.";
  } else if (coreEntries.length > 1) {
    category = "MISMATCH ❌";
    details = "Duplicate settlement in CoreLedger.";
  } else if (customer && processorEntries[0] && coreEntries[0]) {
    const processor = processorEntries[0];
    const core = coreEntries[0];

    if (processor.amount === core.amount && customer.status === "SETTLED") {
      category = "MATCHED ✅";
      details = "All ledgers agree on amount and status.";
    } else if (Math.abs(processor.amount - core.amount) <= 1) {
      category = "MISMATCH ❌";
      details = "FX Adjustment: amounts differ slightly.";
    } else {
      category = "MISMATCH ❌";
      details = "Amounts differ across ledgers.";
    }
  } else if (customer && customer.status === "PENDING") {
    category = "PENDING ⏳";
    details = "Customer shows PENDING, waiting for other ledgers.";
  } else if (customer && processorEntries.length === 0) {
    category = "MISMATCH ❌";
    details = "Missing Processor entry.";
  } else if (customer && coreEntries.length === 0) {
    category = "MISMATCH ❌";
    details = "Missing Core entry.";
  }

  return { category, details };
}
