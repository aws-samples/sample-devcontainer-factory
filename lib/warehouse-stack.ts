/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * warehouse-stack - stateful resources stack for S3, KMS
 * keys, and ECR repository.
 */

import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface WarehouseStackProps extends cdk.StackProps {
  /**
   * Resource name space (used as path)
   */
  readonly namespace: string;

  /**
   * Expiration period for source and artifact files
   *
   * @default - 7 days
   */
  readonly expiration?: cdk.Duration;
}

export class WarehouseStack extends cdk.Stack {
  readonly namespace: string;
  readonly sourceBucket: s3.IBucket;
  readonly artifactBucket: s3.IBucket;
  readonly repositoryKey: kms.IKey;
  readonly buildRole: iam.IRole;
  readonly pipelineRole: iam.IRole;
  readonly repository?: ecr.IRepository;

  constructor(scope: Construct, id: string, props: WarehouseStackProps) {
    super(scope, id, props);

    if (!props.namespace) throw new Error("Namespace property is required");
    this.namespace = props.namespace;

    // Create shared buckets for the pipeline(s)
    const { expiration = cdk.Duration.days(7) } = props;
    this.sourceBucket = this.createBucket("SourceBucket", { expiration });
    this.artifactBucket = this.createBucket("ArtifactBucket", { expiration });

    new cdk.CfnOutput(this, "SourceBucketName", {
      value: this.sourceBucket.bucketName,
      description: "Used to store the devcontainer source files (.zip)",
    });

    // Create a single key to be used by all ECR repositories.
    this.repositoryKey = new kms.Key(this, "RepositoryKey", {
      alias: `${this.namespace}/RepositoryKey`,
      description: "Devcontainers ECR repository key",
    });
  }

  private createBucket(
    id: string,
    options: {
      expiration: cdk.Duration;
    }
  ) {
    return new s3.Bucket(this, id, {
      encryption: s3.BucketEncryption.KMS,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      eventBridgeEnabled: true,
      versioned: true,
      serverAccessLogsPrefix: "access-logs/",
      lifecycleRules: [
        {
          id: "DeleteOldFiles",
          expiration: options.expiration,
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
    });
  }

  public createRepository(id: string, repositoryName: string) {
    return new ecr.Repository(this, id, {
      repositoryName: `${this.namespace}/${repositoryName}`,
      encryptionKey: this.repositoryKey,
      imageScanOnPush: true,
      lifecycleRules: [
        { tagPrefixList: ["dev-"], maxImageAge: cdk.Duration.days(30) },
        { maxImageCount: 10 },
      ],
    });
  }
}
