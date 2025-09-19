import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";

export class ReconciliationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Customer Ledger (simple: txId only)
    const customerLedger = new dynamodb.Table(this, "CustomerLedger", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      tableName: "ReconStack-CustomerLedger",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 2. Processor Ledger (txId + timestamp, since multiple entries possible)
    new dynamodb.Table(this, "ProcessorLedger", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      tableName: "ReconStack-ProcessorLedger",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 3. Core Ledger (txId + timestamp, similar reasoning as processor)
    new dynamodb.Table(this, "CoreLedger", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      tableName: "ReconStack-CoreLedger",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 4. Reconciliation Findings (txId + category)
    new dynamodb.Table(this, "ReconciliationFindings", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "category", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "ReconStack-ReconciliationFindings",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 5. Daily Summary (date = PK)
    new dynamodb.Table(this, "DailySummary", {
      partitionKey: { name: "date", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "ReconStack-DailySummary",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 🚀 SubmitTransaction Lambda
    const submitTransactionLambda = new lambdaNodejs.NodejsFunction(this, "ReconStackSubmitTransactionLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../lambdas/submit-transaction")),
      environment: {
        CUSTOMER_LEDGER_TABLE: customerLedger.tableName,
      },
    });

    // Grant write access
    customerLedger.grantWriteData(submitTransactionLambda);

    // 🚀 API Gateway
    const api = new apigateway.RestApi(this, "ReconciliationApi", {
      restApiName: "Reconciliation Service",
      description: "APIs for ledger reconciliation demo",
    });

    // POST /transaction → SubmitTransaction Lambda
    const transactionResource = api.root.addResource("transaction");
    transactionResource.addMethod("POST", new apigateway.LambdaIntegration(submitTransactionLambda));

  }
}
