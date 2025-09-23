import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({});
const FINDINGS_TABLE = process.env.FINDINGS_TABLE!;

export const handler = async () => {
  try {
    const res = await ddb.send(new ScanCommand({ TableName: FINDINGS_TABLE }));
    const items = res.Items?.map((i) => unmarshall(i)) ?? [];

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // allow browser fetch
        "Access-Control-Allow-Headers": "Content-Type,X-Api-Key",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
      body: JSON.stringify(items),
    };
  } catch (err: any) {
    console.error("Error fetching findings:", err);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Api-Key",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
      body: JSON.stringify({ error: "Failed to fetch findings" }),
    };
  }
};
