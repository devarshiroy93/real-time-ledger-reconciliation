import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

const ddb = new DynamoDBClient({});

export const handler = async (event: any = {}): Promise<any> => {
  console.log("Incoming event:", event);

  const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

  const txId = body.txId || uuidv4();
  const userId = body.userId || "demo-user";
  const amount = body.amount || 100;
  const status = "PENDING";
  const createdAt = new Date().toISOString();

  await ddb.send(
    new PutItemCommand({
      TableName: process.env.CUSTOMER_LEDGER_TABLE!,
      Item: {
        txId: { S: txId },
        userId: { S: userId },
        amount: { N: amount.toString() },
        status: { S: status },
        createdAt: { S: createdAt },
      },
      ConditionExpression: "attribute_not_exists(txId)", // idempotency
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Transaction created", txId, userId, amount, status, createdAt }),
  };
};
