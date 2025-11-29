import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { WarehouseStack } from "../../lib/warehouse-stack";

describe("WarehouseStack", () => {
  const createTestStack = (namespace = "devcontainers/test-container") => {
    const app = new cdk.App();

    return new WarehouseStack(app, "TestWarehouseStack", {
      namespace,
    });
  };

  test("throws error when namespace is not provided", () => {
    expect(() => createTestStack("")).toThrow("Namespace property is required");
  });

  test("creates S3 bucket with correct configuration", () => {
    const template = Template.fromStack(createTestStack());
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: "aws:kms",
            },
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: {
        Status: "Enabled",
      },
      LifecycleConfiguration: {
        Rules: [
          {
            ExpirationInDays: 7,
            Id: "DeleteOldFiles",
            Status: "Enabled",
            AbortIncompleteMultipartUpload: {
              DaysAfterInitiation: 1,
            },
          },
        ],
      },
      LoggingConfiguration: {
        LogFilePrefix: "access-logs/",
      },
    });
  });

  test("outputs required resources", () => {
    const template = Template.fromStack(createTestStack());
    template.hasOutput("SourceBucketName", {});
  });

  test("creates repository with correct configuration", () => {
    const stack = createTestStack();
    stack.createRepository("TestRepo", "test-repo");

    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::ECR::Repository", {
      RepositoryName: "devcontainers/test-container/test-repo",
      ImageScanningConfiguration: {
        ScanOnPush: true,
      },
      EncryptionConfiguration: {
        EncryptionType: "KMS",
      },
      LifecyclePolicy: {
        LifecyclePolicyText: Match.anyValue(),
      },
    });
  });
});
