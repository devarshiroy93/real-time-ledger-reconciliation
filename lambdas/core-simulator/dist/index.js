"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const uuid_1 = require("uuid");
const ddb = new client_dynamodb_1.DynamoDBClient({});
const handler = async (event = {}) => {
    console.log("Incoming event:", event);
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const txId = body.txId || (0, uuid_1.v4)();
    const amount = body.amount ?? 100;
    const status = body.status || "SETTLED";
    const coreRef = body.coreRef || `core-${(0, uuid_1.v4)()}`;
    const timestamp = new Date().toISOString();
    await ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: process.env.CORE_LEDGER_TABLE,
        Item: {
            txId: { S: txId },
            timestamp: { S: timestamp },
            amount: { N: amount.toString() },
            status: { S: status },
            coreRef: { S: coreRef },
        },
    }));
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Core txn simulated",
            txId,
            amount,
            status,
            coreRef,
            timestamp,
        }),
    };
};
exports.handler = handler;
