/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

export interface BuildProjectProps {
  /**
   * IAM role used by CodeBuild to execute build commands.
   * Must have permissions to pull/push ECR images and access other required resources.
   *
   * @default - A new role is created.
   */
  role?: iam.IRole;

  /**
   * KMS key used to encrypt CodeBuild artifacts and logs.
   *
   * @default - AWS Managed key is used.
   */
  encryptionKey?: kms.IKey;

  /**
   * Build image to use for the CodeBuild project.
   *
   * @default - codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0
   */
  buildImage?: codebuild.IBuildImage;

  /**
   * Compute type for the CodeBuild project.
   * Determines the resources allocated to the build.
   *
   * @default - codebuild.ComputeType.SMALL
   */
  computeType?: codebuild.ComputeType;

  /**
   * Path to the buildspec file that defines the build process.
   * Relative to the project root.
   *
   * @default - "./assets/buildspec.yml"
   */
  buildSpecPath?: string;

  /**
   * Environment variables to pass to the CodeBuild project.
   */
  environmentVariables?: { [name: string]: codebuild.BuildEnvironmentVariable };

  /**
   * Build timeout
   *
   * @default - cdk.Duration.hours(2).
   */
  timeout?: cdk.Duration;

  /**
   * Description of the CodeBuild project.
   *
   * @default - No description.
   */
  description?: string;
}

export class BuildProject extends Construct {
  public readonly project: codebuild.Project;

  constructor(scope: Construct, id: string, props: BuildProjectProps) {
    super(scope, id);

    const {
      buildImage = codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
      computeType = codebuild.ComputeType.SMALL,
      buildSpecPath = "./assets/buildspec/build.yml",
      timeout = cdk.Duration.hours(2),
      description,
      role,
      encryptionKey,
      environmentVariables,
    } = props;

    this.project = new codebuild.PipelineProject(this, "Project", {
      description,
      role,
      encryptionKey,
      timeout,
      buildSpec: codebuild.BuildSpec.fromAsset(buildSpecPath),
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
      environment: {
        buildImage,
        computeType,
        privileged: true,
        environmentVariables,
      },
    });

    new cdk.aws_cloudwatch.Alarm(this, "BuildFailureAlarm", {
      metric: this.project.metricFailedBuilds(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: `Alert on failed builds for ${this.project.projectName}`,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });
  }
}
