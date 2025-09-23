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

    // ---------------- Tables ----------------
    const customerLedger = new dynamodb.Table(this, "CustomerLedger", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      tableName: "ReconStack-CustomerLedger",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const processorLedger = new dynamodb.Table(this, "ProcessorLedger", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      tableName: "ReconStack-ProcessorLedger",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const coreLedger = new dynamodb.Table(this, "CoreLedger", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      tableName: "ReconStack-CoreLedger",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const reconciliationFindings = new dynamodb.Table(this, "ReconciliationFindings", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "ReconStack-ReconciliationFindingsV2",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new dynamodb.Table(this, "DailySummary", {
      partitionKey: { name: "date", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "ReconStack-DailySummary",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const reconciliationAudit = new dynamodb.Table(this, "ReconciliationAudit", {
      partitionKey: { name: "txId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "eventTimestamp", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "ReconStack-ReconciliationAudit",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ---------------- Lambdas ----------------
    const submitTransactionLambda = new lambdaNodejs.NodejsFunction(this, "ReconStackSubmitTransactionLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, "../../lambdas/submit-transaction/index.ts"),
      handler: "handler",
      environment: {
        CUSTOMER_LEDGER_TABLE: customerLedger.tableName,
      },
    });
    customerLedger.grantWriteData(submitTransactionLambda);

    const processorSimulatorLambda = new lambdaNodejs.NodejsFunction(this, "ReconStackProcessorSimulatorLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, "../../lambdas/processor-simulator/index.ts"),
      handler: "handler",
      environment: {
        PROCESSOR_LEDGER_TABLE: processorLedger.tableName,
      },
    });
    processorLedger.grantWriteData(processorSimulatorLambda);

    const coreSimulatorLambda = new lambdaNodejs.NodejsFunction(this, "ReconStackCoreSimulatorLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, "../../lambdas/core-simulator/index.ts"),
      handler: "handler",
      environment: {
        CORE_LEDGER_TABLE: coreLedger.tableName,
      },
    });
    coreLedger.grantWriteData(coreSimulatorLambda);

    const reconciliationFn = new lambdaNodejs.NodejsFunction(this, "ReconStackReconciliationEngineLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, "../../lambdas/reconciliation-engine/index.ts"),
      handler: "handler",
      environment: {
        CUSTOMER_LEDGER_TABLE: customerLedger.tableName,
        PROCESSOR_LEDGER_TABLE: processorLedger.tableName,
        CORE_LEDGER_TABLE: coreLedger.tableName,
        FINDINGS_TABLE: reconciliationFindings.tableName,
        AUDIT_TABLE: reconciliationAudit.tableName,
      },
    });
    customerLedger.grantReadWriteData(reconciliationFn);
    processorLedger.grantReadData(reconciliationFn);
    coreLedger.grantReadData(reconciliationFn);
    reconciliationFindings.grantReadWriteData(reconciliationFn);
    reconciliationAudit.grantWriteData(reconciliationFn);

    reconciliationFn.addEventSource(
      new sources.DynamoEventSource(customerLedger, { startingPosition: lambda.StartingPosition.LATEST })
    );
    reconciliationFn.addEventSource(
      new sources.DynamoEventSource(processorLedger, { startingPosition: lambda.StartingPosition.LATEST })
    );
    reconciliationFn.addEventSource(
      new sources.DynamoEventSource(coreLedger, { startingPosition: lambda.StartingPosition.LATEST })
    );

    // ---------------- API Gateway ----------------
    const api = new apigateway.RestApi(this, "ReconciliationApi", {
      restApiName: "Reconciliation Service",
      description: "APIs for ledger reconciliation demo",
    });

    // API Key + Usage Plan
    const apiKey = api.addApiKey("ReconciliationApiKey", {
      apiKeyName: "ReconDemoKey",
      description: "API Key for Reconciliation POC",
    });

    const plan = api.addUsagePlan("ReconciliationUsagePlan", {
      name: "ReconUsagePlan",
      description: "Limit to 1 req/sec and 100 req/day",
      throttle: { rateLimit: 1, burstLimit: 1 },
      quota: { limit: 100, period: apigateway.Period.DAY },
    });

    plan.addApiStage({ stage: api.deploymentStage });
    plan.addApiKey(apiKey);

    // ---- Endpoints ----
    const transactionResource = api.root.addResource("transaction");
    transactionResource.addMethod("POST", new apigateway.LambdaIntegration(submitTransactionLambda), {
      apiKeyRequired: true,
    });

    const simulateResource = api.root.addResource("simulate");
    const processorResource = simulateResource.addResource("processor");
    processorResource.addMethod("POST", new apigateway.LambdaIntegration(processorSimulatorLambda), {
      apiKeyRequired: true,
    });

    const coreResource = simulateResource.addResource("core");
    coreResource.addMethod("POST", new apigateway.LambdaIntegration(coreSimulatorLambda), {
      apiKeyRequired: true,
    });

    // ---- UI Support Endpoints ----
    // GET /findings
    const getFindingsLambda = new lambdaNodejs.NodejsFunction(this, "ReconStackGetFindingsLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, "../../lambdas/get-findings/index.ts"),
      handler: "handler",
      environment: { FINDINGS_TABLE: reconciliationFindings.tableName },
    });
    reconciliationFindings.grantReadData(getFindingsLambda);

    const findingsResource = api.root.addResource("findings");
    findingsResource.addMethod("GET", new apigateway.LambdaIntegration(getFindingsLambda), {
      apiKeyRequired: true,
    });

    findingsResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Api-Key"],
    });

    // GET /audit/{txId}
    const getAuditLambda = new lambdaNodejs.NodejsFunction(this, "ReconStackGetAuditLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, "../../lambdas/get-audit/index.ts"),
      handler: "handler",
      environment: { AUDIT_TABLE: reconciliationAudit.tableName },
    });
    reconciliationAudit.grantReadData(getAuditLambda);

    const auditResource = api.root.addResource("audit");

    // ✅ CORS for /audit
    auditResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Api-Key"],
    });

    const auditById = auditResource.addResource("{txId}");
    auditById.addMethod("GET", new apigateway.LambdaIntegration(getAuditLambda), {
      apiKeyRequired: true,
    });

    // ✅ CORS for /audit/{txId}
    auditById.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Api-Key"],
    });
  }
}
