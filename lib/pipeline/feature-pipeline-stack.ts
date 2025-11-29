/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * feature-pipeline-stack - stateless resources stack to build dev container
 * features.
 */

import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import {
  BasePipelineStack,
  BasePipelineStackProps,
} from "./base-pipeline-stack";

export class FeaturePipelineStack extends BasePipelineStack {
  constructor(scope: Construct, id: string, props: BasePipelineStackProps) {
    super(scope, id, props);
  }

  protected configurePipeline() {
    // To support semantic versioning, enable write access to parent repo.
    this.buildRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ecr:InitiateLayerUpload",
          "ecr:ListImages",
          "ecr:PutImage",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ],
        resources: [
          cdk.Stack.of(this).formatArn({
            service: "ecr",
            resource: `repository/${this.namespace}`,
            resourceName: "features",
          }),
        ],
      })
    );

    const buildProject = this.createBuildProject("BuildProject", {
      computeType: codebuild.ComputeType.LARGE,
      buildSpecPath: "./assets/buildspec/feature.yml",
      description: "Build environment for devcontainer features",
    });

    this.pipeline.addStageActions("Publish", [
      {
        actionName: "Publish",
        project: buildProject,
        environmentVariables: {
          AWS_REGISTRY: { value: this.registry },
          NAMESPACE: { value: `${this.namespace}/features` },
        },
      },
    ]);
  }
}
