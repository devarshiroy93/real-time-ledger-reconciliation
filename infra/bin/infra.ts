#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ReconciliationStack } from '../lib/ReconciliationStack';

const app = new cdk.App();
new ReconciliationStack(app, 'ReconciliationStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
