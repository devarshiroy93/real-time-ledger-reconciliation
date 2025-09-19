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
    const userId = body.userId || "demo-user";
    const amount = body.amount || 100;
    const status = "PENDING";
    const createdAt = new Date().toISOString();
    await ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: process.env.CUSTOMER_LEDGER_TABLE,
        Item: {
            txId: { S: txId },
            userId: { S: userId },
            amount: { N: amount.toString() },
            status: { S: status },
            createdAt: { S: createdAt },
        },
        ConditionExpression: "attribute_not_exists(txId)", // idempotency
    }));
    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Transaction created", txId, userId, amount, status, createdAt }),
    };
};
exports.handler = handler;
