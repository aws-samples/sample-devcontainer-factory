/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

import * as cdk from "aws-cdk-lib";
import {
  ImagePipelineStack,
  FeaturePipelineStack,
  WarehouseStack,
} from "../lib";

/**
 * This is an integration test that creates both the warehouse and pipeline stacks
 * to test the complete devcontainer application.
 */
const app = new cdk.App();

const namespace = "devcontainers";
const image = "test-container";
const feature = "test-feature";
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Create the main warehouse stack
const warehouseStack = new WarehouseStack(app, "WarehouseStack", {
  namespace,
  env,
});

// Create the image warehouse stack
const imagePipelineStack = new ImagePipelineStack(
  app,
  `Image-${image}-PipelineStack`,
  {
    namespace: `${namespace}/images`,
    identifier: image,
    sourceBucket: warehouseStack.sourceBucket,
    artifactBucket: warehouseStack.artifactBucket,
    repository: warehouseStack.createRepository(
      `Repository-${image}`,
      `images/${image}`
    ),
    env,
  }
);

imagePipelineStack.addDependency(warehouseStack);

// Create the feature warehouse stack
const featurePipelineStack = new FeaturePipelineStack(
  app,
  `Feature-${feature}-PipelineStack`,
  {
    namespace: `${namespace}/features`,
    identifier: feature,
    sourceBucket: warehouseStack.sourceBucket,
    artifactBucket: warehouseStack.artifactBucket,
    repository: warehouseStack.createRepository(
      `Repository-${feature}`,
      `features/${feature}`
    ),
    env,
  }
);

featurePipelineStack.addDependency(warehouseStack);

app.synth();
