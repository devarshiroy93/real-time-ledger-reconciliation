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
    const customer = await getLedgerEntry(CUSTOMER_TABLE, txId);
    const processor = await getLedgerEntry(PROCESSOR_TABLE, txId);
    const core = await getLedgerEntry(CORE_TABLE, txId);
    let category = "PENDING \u23F3";
    let details = "Waiting for more ledger entries.";
    if (customer && processor && core) {
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
    } else if (customer && !processor) {
      category = "MISMATCH \u274C";
      details = "Missing Processor entry.";
    }
    await ddb.send(
      new import_client_dynamodb.PutItemCommand({
        TableName: FINDINGS_TABLE,
        Item: {
          txId: { S: txId },
          category: { S: category },
          details: { S: details },
          timestamp: { S: (/* @__PURE__ */ new Date()).toISOString() }
        }
      })
    );
    console.log(`Finding recorded for ${txId}: ${category}`);
  }
};
async function getLedgerEntry(table, txId) {
  const res = await ddb.send(
    new import_client_dynamodb.GetItemCommand({
      TableName: table,
      Key: { txId: { S: txId } }
    })
  );
  return res.Item ? (0, import_util_dynamodb.unmarshall)(res.Item) : null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
