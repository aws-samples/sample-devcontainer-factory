/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Creates a pipeline skeleton using S3 notifications as trigger.
 */

import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as events from "aws-cdk-lib/aws-events";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Construct } from "constructs";

/**
 * Properties for the S3EventPipeline construct
 */
export interface S3EventPipelineProps {
  /**
   * Role to be used by codepipeline
   *
   * @default - Create a new role.
   */
  readonly role?: iam.IRole;

  /**
   * S3 bucket where the source is stored.
   */
  readonly sourceBucket: s3.IBucket;

  /*
   * The key within the S3 bucket that stores the source code.
   *
   * @default - source.zip
   */
  readonly sourceBucketKey?: string;

  /**
   * Artifact bucket
   *
   * @default - An artifact bucket will be created
   */
  readonly artifactBucket?: s3.IBucket;
}

/**
 * Construct that creates a CodePipeline triggered by S3 events for building, testing, and releasing a container
 */
export class S3EventPipeline extends Construct {
  public readonly sourceOutput: codepipeline.Artifact;
  public readonly pipeline: codepipeline.Pipeline;

  constructor(scope: Construct, id: string, props: S3EventPipelineProps) {
    super(scope, id);

    const {
      sourceBucket,
      sourceBucketKey = "source.zip",
      role,
      artifactBucket,
    } = props;

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.S3SourceAction({
      actionName: "S3Source",
      bucket: sourceBucket,
      bucketKey: sourceBucketKey,
      output: sourceOutput,
      variablesNamespace: "SourceVariables",
      trigger: codepipeline_actions.S3Trigger.NONE,
    });

    this.pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      pipelineType: codepipeline.PipelineType.V2,
      artifactBucket,
      role,
      usePipelineRoleForActions: true,
      stages: [{ stageName: "Source", actions: [sourceAction] }],
    });

    const { bucketArn, bucketName } = sourceBucket;
    new events.Rule(this, "S3ObjectCreatedRule", {
      eventPattern: {
        source: ["aws.s3"],
        detailType: ["Object Created"],
        resources: [bucketArn],
        detail: {
          bucket: {
            name: [bucketName],
          },
          object: {
            key: [sourceBucketKey],
          },
        },
      },
      targets: [new targets.CodePipeline(this.pipeline)],
      description: `Rule for S3 object created events in bucket ${bucketName}/${sourceBucketKey}`,
    });

    this.sourceOutput = sourceOutput;
  }

  public addStageActions(
    stageName: string,
    actions: {
      actionName: string;
      project: codebuild.IProject;
      environmentVariables?: {
        [name: string]: codebuild.BuildEnvironmentVariable;
      };
    }[]
  ): codepipeline.IStage {
    return this.pipeline.addStage({
      stageName,
      actions: actions.map(
        ({ actionName, project, environmentVariables }) =>
          new codepipeline_actions.CodeBuildAction({
            actionName,
            project,
            environmentVariables,
            input: this.sourceOutput,
          })
      ),
    });
  }
}
