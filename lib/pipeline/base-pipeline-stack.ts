/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * (abstract) pipeline-stack - stateless resources stack to build dev container
 * images or features.
 */

import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { BuildProject } from "../constructs/build-project";
import { S3EventPipeline } from "../constructs/s3-event-pipeline";

export interface BasePipelineStackProps extends cdk.StackProps {
  /**
   * Resource name space (used as path)
   */
  readonly namespace: string;

  /**
   * Bucket to store the devcontainer source.
   */
  readonly sourceBucket: s3.IBucket;

  /**
   * Bucket used for artifacts.
   */
  readonly artifactBucket: s3.IBucket;

  /**
   * Repository to store the devcontainer image.
   */
  readonly repository: ecr.IRepository;

  /**
   * Identifier (e.g., container name or feature name)
   */
  readonly identifier: string;
}

export abstract class BasePipelineStack extends cdk.Stack {
  readonly pipeline: S3EventPipeline;
  readonly buildRole: iam.Role;
  readonly registry: string;
  readonly namespace: string;
  readonly identifier: string;
  readonly repository: ecr.IRepository;
  readonly artifactBucket: s3.IBucket;

  constructor(scope: Construct, id: string, props: BasePipelineStackProps) {
    super(scope, id, props);

    if (!props.namespace) throw new Error("namespace property is required");
    if (!props.identifier) throw new Error("identifier property is required");

    const { artifactBucket, identifier, namespace, sourceBucket, repository } =
      props;

    const { account, region } = cdk.Stack.of(this);
    this.registry = `${account}.dkr.ecr.${region}.amazonaws.com`;

    this.repository = repository;
    this.artifactBucket = artifactBucket;
    this.namespace = namespace;
    this.identifier = identifier;

    this.buildRole = new iam.Role(this, "BuildRole", {
      path: `/${this.namespace}/${identifier}/`,
      description: "Shared build role for CodeBuild",
      assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
    });

    const sourceBucketKey = `${namespace}/${identifier}.zip`;
    sourceBucket.grantRead(this.buildRole, `${namespace}/${identifier}.zip`);

    // Allow build role to push to their ECR
    repository.grantPush(this.buildRole);

    // Allow build role to consume other (base) images and features
    this.buildRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:ListImages",
        ],
        resources: [
          cdk.Stack.of(this).formatArn({
            service: "ecr",
            resource: "repository",
            resourceName: `${namespace}/*`,
          }),
        ],
      })
    );

    const pipelineRole = new iam.Role(this, "PipelineRole", {
      path: `/${this.namespace}/${identifier}/`,
      description: "Shared pipeline role for CodePipeline",
      assumedBy: new iam.ServicePrincipal("codepipeline.amazonaws.com"),
    });

    // Create an s3 event pipeline
    this.pipeline = new S3EventPipeline(this, "Pipeline", {
      role: pipelineRole,
      artifactBucket: this.artifactBucket,
      sourceBucket,
      sourceBucketKey,
    });

    new cdk.CfnOutput(this, "PipelineNameOutput", {
      value: this.pipeline.pipeline.pipelineName,
      description: `Pipeline for ${this.identifier}`,
    });

    new ssm.StringParameter(this, "PipelineNameParameter", {
      parameterName: `/${this.namespace}/${this.identifier}/pipeline/name`,
      stringValue: this.pipeline.pipeline.pipelineName,
      description: `Pipeline for ${this.identifier}`,
    });

    // Configure pipeline (implemented by subclasses)
    this.configurePipeline();
  }

  /**
   * Configure the pipeline stages and actions
   * This method must be implemented by subclasses
   */
  protected abstract configurePipeline(): void;

  /**
   * Create a build project with standard configuration
   */
  protected createBuildProject(
    id: string,
    options: {
      description: string;
      buildSpecPath: string;
      buildImage?: codebuild.IBuildImage;
      computeType?: codebuild.ComputeType;
      environmentVariables?: {
        [name: string]: codebuild.BuildEnvironmentVariable;
      };
    }
  ): codebuild.IProject {
    return new BuildProject(this, id, {
      role: this.buildRole,
      encryptionKey: this.artifactBucket?.encryptionKey,
      buildImage: options.buildImage,
      computeType: options.computeType ?? codebuild.ComputeType.LARGE,
      buildSpecPath: options.buildSpecPath,
      description: `[${this.identifier}] ${options.description}`,
      environmentVariables: options.environmentVariables,
    }).project;
  }
}
