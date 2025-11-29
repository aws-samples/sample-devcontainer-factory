#!/usr/bin/env node
/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Creates devcontainer image or feature pipeline(s).
 *
 * Usage:
 *  cdk deploy --context images=node,python --context features=aws-cli --all
 */

import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";
import {
  FeaturePipelineStack,
  ImagePipelineStack,
  WarehouseStack,
} from "../lib";

const app = new cdk.App();
cdk.Aspects.of(app).add(new AwsSolutionsChecks());

const features: string[] = app.node
  .tryGetContext("features")
  ?.split(",")
  ?.map((feature: string) => feature.trim());
const images: string[] = app.node
  .tryGetContext("images")
  ?.split(",")
  ?.map((image: string) => image.trim());
const namespace: string = app.node.tryGetContext("namespace");

/**
 * Create a single devcontainer warehouse for Amazon S3 buckets and KMS keys
 * omit ECR repository. Devcontainer images and features may be removed, this
 * stack must persist.
 */
const warehouseStack = new WarehouseStack(app, "WarehouseStack", { namespace });
NagSuppressions.addResourceSuppressionsByPath(
  warehouseStack,
  "/WarehouseStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role",
  [
    { id: "AwsSolutions-IAM4", reason: "CDK custom resource." },
    { id: "AwsSolutions-IAM5", reason: "Managed by CDK grant()." },
  ]
);

NagSuppressions.addStackSuppressions(warehouseStack, [
  { id: "AwsSolutions-KMS5", reason: "Enable for reg. compliance." },
]);

cdk.Tags.of(warehouseStack).add(
  "cost-allocation:ApplicationId",
  `${namespace}/warehouse`
);

if (features?.length) {
  // Features use top-level repo to enable semantic versioning
  warehouseStack.createRepository("Repository-Features", "features");

  features.forEach((feature) => {
    const identifier = `features/${feature}`;
    const pipelineStack = new FeaturePipelineStack(
      app,
      `Feature-${feature}-PipelineStack`,
      {
        namespace,
        identifier,
        sourceBucket: warehouseStack.sourceBucket,
        artifactBucket: warehouseStack.artifactBucket,
        repository: warehouseStack.createRepository(
          `Repository-${feature}`,
          identifier
        ),
      }
    );

    pipelineStack.addDependency(warehouseStack);
    NagSuppressions.addStackSuppressions(pipelineStack, [
      {
        id: "AwsSolutions-IAM5",
        reason: "Partial-wildcard statements managed by CDK grant().",
      },
    ]);

    cdk.Tags.of(pipelineStack).add(
      "cost-allocation:ApplicationId",
      `${namespace}/features/${feature}`
    );
  });
}

images?.forEach((image) => {
  const identifier = `images/${image}`;
  const pipelineStack = new ImagePipelineStack(
    app,
    `Image-${image}-PipelineStack`,
    {
      namespace,
      identifier,
      sourceBucket: warehouseStack.sourceBucket,
      artifactBucket: warehouseStack.artifactBucket,
      repository: warehouseStack.createRepository(
        `Repository-${image}`,
        identifier
      ),
    }
  );

  pipelineStack.addDependency(warehouseStack);
  NagSuppressions.addStackSuppressions(pipelineStack, [
    {
      id: "AwsSolutions-IAM5",
      reason: "Wildcard statements managed by grant().",
    },
  ]);

  cdk.Tags.of(pipelineStack).add(
    "cost-allocation:ApplicationId",
    `${namespace}/images/${image}`
  );
});
