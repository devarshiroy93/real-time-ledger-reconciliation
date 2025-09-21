"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../lambdas/reconciliation-engine/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_util_dynamodb = require("@aws-sdk/util-dynamodb");
var ddb = new import_client_dynamodb.DynamoDBClient({});
var CUSTOMER_TABLE = process.env.CUSTOMER_LEDGER_TABLE;
var PROCESSOR_TABLE = process.env.PROCESSOR_LEDGER_TABLE;
var CORE_TABLE = process.env.CORE_LEDGER_TABLE;
var FINDINGS_TABLE = process.env.FINDINGS_TABLE;
var handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    if (record.eventName !== "INSERT") continue;
    const txId = record.dynamodb.Keys.txId.S;
    console.log(`Reconciling txId: ${txId}`);
    const customerEntries = await getLedgerEntries(CUSTOMER_TABLE, txId);
    const processorEntries = await getLedgerEntries(PROCESSOR_TABLE, txId);
    const coreEntries = await getLedgerEntries(CORE_TABLE, txId);
    const customer = customerEntries[0] ?? null;
    if (customer && processorEntries.length > 0 && customer.status === "PENDING") {
      try {
        await ddb.send(
          new import_client_dynamodb.UpdateItemCommand({
            TableName: CUSTOMER_TABLE,
            Key: { txId: { S: customer.txId } },
            UpdateExpression: "SET #s = :s",
            ExpressionAttributeNames: { "#s": "status" },
            ConditionExpression: "#s = :pending",
            // only update if still PENDING
            ExpressionAttributeValues: {
              ":s": { S: "SETTLED" },
              ":pending": { S: "PENDING" }
            }
          })
        );
        console.log(`CustomerLedger updated to SETTLED for ${txId}`);
        customer.status = "SETTLED";
      } catch (err) {
        if (err.name === "ConditionalCheckFailedException") {
          console.log(`CustomerLedger already updated for ${txId}`);
        } else {
          console.error("CustomerLedger update error", err);
          throw err;
        }
      }
    }
    const { category, details } = decideOutcome(customer, processorEntries, coreEntries);
    try {
      await ddb.send(
        new import_client_dynamodb.PutItemCommand({
          TableName: FINDINGS_TABLE,
          Item: {
            txId: { S: txId },
            category: { S: category },
            details: { S: details },
            timestamp: { S: (/* @__PURE__ */ new Date()).toISOString() },
            statusHistory: { L: [{ S: category }] }
          },
          ConditionExpression: "attribute_not_exists(txId)"
          // only first insert succeeds
        })
      );
      console.log(`Inserted new finding for ${txId}: ${category}`);
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        await ddb.send(
          new import_client_dynamodb.UpdateItemCommand({
            TableName: FINDINGS_TABLE,
            Key: { txId: { S: txId }, category: { S: category } },
            // PK+SK
            UpdateExpression: "SET details = :d, timestamp = :t ADD statusHistory :s",
            ExpressionAttributeValues: {
              ":d": { S: details },
              ":t": { S: (/* @__PURE__ */ new Date()).toISOString() },
              ":s": { L: [{ S: category }] }
            }
          })
        );
        console.log(`Updated finding for ${txId}: ${category}`);
      } else {
        console.error("Write error", err);
        throw err;
      }
    }
  }
};
async function getLedgerEntries(table, txId) {
  const res = await ddb.send(
    new import_client_dynamodb.QueryCommand({
      TableName: table,
      KeyConditionExpression: "txId = :t",
      ExpressionAttributeValues: { ":t": { S: txId } }
    })
  );
  return res.Items?.map((i) => (0, import_util_dynamodb.unmarshall)(i)) ?? [];
}
function decideOutcome(customer, processorEntries, coreEntries) {
  let category = "PENDING \u23F3";
  let details = "Waiting for more ledger entries.";
  if (processorEntries.length > 1) {
    category = "MISMATCH \u274C";
    details = "Duplicate settlement in ProcessorLedger.";
  } else if (coreEntries.length > 1) {
    category = "MISMATCH \u274C";
    details = "Duplicate settlement in CoreLedger.";
  } else if (customer && processorEntries[0] && coreEntries[0]) {
    const processor = processorEntries[0];
    const core = coreEntries[0];
    if (processor.amount === core.amount && customer.status === "SETTLED") {
      category = "MATCHED \u2705";
      details = "All ledgers agree on amount and status.";
    } else if (Math.abs(processor.amount - core.amount) <= 1) {
      category = "MISMATCH \u274C";
      details = "FX Adjustment: amounts differ slightly.";
    } else {
      category = "MISMATCH \u274C";
      details = "Amounts differ across ledgers.";
    }
  } else if (customer && customer.status === "PENDING") {
    category = "PENDING \u23F3";
    details = "Customer shows PENDING, waiting for other ledgers.";
  } else if (customer && processorEntries.length === 0) {
    category = "MISMATCH \u274C";
    details = "Missing Processor entry.";
  } else if (customer && coreEntries.length === 0) {
    category = "MISMATCH \u274C";
    details = "Missing Core entry.";
  }
  return { category, details };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
