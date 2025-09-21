import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

const ddb = new DynamoDBClient({});

export const handler = async (event: any = {}): Promise<any> => {
  console.log("Incoming event:", event);

  const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

  const txId = body.txId || uuidv4();
  const amount = body.amount ?? (100 + Math.floor(Math.random() * 5)); // maybe tweak amount
  const status = body.status || "SETTLED";
  const processorRef = body.processorRef || `proc-${uuidv4()}`;
  const timestamp = new Date().toISOString();

  await ddb.send(
    new PutItemCommand({
      TableName: process.env.PROCESSOR_LEDGER_TABLE!,
      Item: {
        txId: { S: txId },
        timestamp: { S: timestamp },
        amount: { N: amount.toString() },
        status: { S: status },
        processorRef: { S: processorRef },
      },
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Processor txn simulated",
      txId,
      amount,
      status,
      processorRef,
      timestamp,
    }),
  };
};
