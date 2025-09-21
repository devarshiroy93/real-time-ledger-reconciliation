import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as sources from "aws-cdk-lib/aws-lambda-event-sources";

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
    const processorLedger = new dynamodb.Table(this, "ProcessorLedger", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      tableName: "ReconStack-ProcessorLedger",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 3. Core Ledger (txId + timestamp, similar reasoning as processor)
    const coreLedger = new dynamodb.Table(this, "CoreLedger", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      tableName: "ReconStack-CoreLedger",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 4. Reconciliation Findings (latest status only, one row per txId)
    const reconciliationFindings = new dynamodb.Table(this, "ReconciliationFindings", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "ReconStack-ReconciliationFindingsV2",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 5. Daily Summary (date = PK)
    new dynamodb.Table(this, "DailySummary", {
      partitionKey: { name: "date", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "ReconStack-DailySummary",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 6. Reconciliation Audit (full lifecycle, append-only)
    const reconciliationAudit = new dynamodb.Table(this, "ReconciliationAudit", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "eventTimestamp", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "ReconStack-ReconciliationAudit",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });


    const submitTransactionLambda = new lambdaNodejs.NodejsFunction(this, "ReconStackSubmitTransactionLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, "../../lambdas/submit-transaction/index.ts"), // 👈 point to .ts file
      handler: "handler", // 👈 name of the exported function in index.ts
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


    // ProcessorSimulator Lambda
    const processorSimulatorLambda = new lambdaNodejs.NodejsFunction(
      this,
      "ReconStackProcessorSimulatorLambda",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "../../lambdas/processor-simulator/index.ts"),
        handler: "handler",
        environment: {
          PROCESSOR_LEDGER_TABLE: processorLedger.tableName,
        },
      }
    );

    // Grant write access
    processorLedger.grantWriteData(processorSimulatorLambda);

    // API Gateway – add /simulate/processor
    const simulateResource = api.root.addResource("simulate");
    const processorResource = simulateResource.addResource("processor");
    processorResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(processorSimulatorLambda)
    );

    // CoreSimulator Lambda
    const coreSimulatorLambda = new lambdaNodejs.NodejsFunction(
      this,
      "ReconStackCoreSimulatorLambda",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "../../lambdas/core-simulator/index.ts"),
        handler: "handler",
        environment: {
          CORE_LEDGER_TABLE: coreLedger.tableName,
        },
      }
    );

    // Grant write access
    coreLedger.grantWriteData(coreSimulatorLambda);

    // API Gateway – add /simulate/core
    const coreResource = simulateResource.addResource("core");
    coreResource.addMethod("POST", new apigateway.LambdaIntegration(coreSimulatorLambda));

    // ReconciliationEngine Lambda
    const reconciliationFn = new lambdaNodejs.NodejsFunction(
      this,
      "ReconStackReconciliationEngineLambda",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(
          __dirname,
          "../../lambdas/reconciliation-engine/index.ts"
        ),
        handler: "handler",
        environment: {
          CUSTOMER_LEDGER_TABLE: customerLedger.tableName,
          PROCESSOR_LEDGER_TABLE: processorLedger.tableName,
          CORE_LEDGER_TABLE: coreLedger.tableName,
          FINDINGS_TABLE: reconciliationFindings.tableName,
          AUDIT_TABLE: reconciliationAudit.tableName,
        },
      }
    );

    // Permissions
    customerLedger.grantReadWriteData(reconciliationFn);
    processorLedger.grantReadData(reconciliationFn);
    coreLedger.grantReadData(reconciliationFn);
    reconciliationFindings.grantReadWriteData(reconciliationFn);
    reconciliationAudit.grantWriteData(reconciliationFn);

    // Attach streams
    reconciliationFn.addEventSource(new sources.DynamoEventSource(customerLedger, { startingPosition: lambda.StartingPosition.LATEST }));
    reconciliationFn.addEventSource(new sources.DynamoEventSource(processorLedger, { startingPosition: lambda.StartingPosition.LATEST }));
    reconciliationFn.addEventSource(new sources.DynamoEventSource(coreLedger, { startingPosition: lambda.StartingPosition.LATEST }));
  }


}
