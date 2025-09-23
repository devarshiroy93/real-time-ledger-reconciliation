import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({});
const AUDIT_TABLE = process.env.AUDIT_TABLE!;

export const handler = async (event: any) => {
  const txId = event.pathParameters?.txId;

  if (!txId) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Api-Key",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
      body: JSON.stringify({ error: "Missing txId" }),
    };
  }

  try {
    const res = await ddb.send(
      new QueryCommand({
        TableName: AUDIT_TABLE,
        KeyConditionExpression: "txId = :t",
        ExpressionAttributeValues: { ":t": { S: txId } },
      })
    );

    const items = res.Items?.map((i) => unmarshall(i)) ?? [];

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Api-Key",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
      body: JSON.stringify(items),
    };
  } catch (err: any) {
    console.error("Error fetching audit:", err);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Api-Key",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
      body: JSON.stringify({ error: "Failed to fetch audit trail" }),
    };
  }
};
