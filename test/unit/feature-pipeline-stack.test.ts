import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { Template, Match } from "aws-cdk-lib/assertions";
import { FeaturePipelineStack } from "../../lib/pipeline/feature-pipeline-stack";

describe("FeaturePipelineStack", () => {
  const createTestStack = (
    namespace = "devcontainers/features",
    identifier = "test-feature"
  ) => {
    const app = new cdk.App();
    const testStack = new cdk.Stack(app, "TestResourceStack");

    const mockSourceBucket = s3.Bucket.fromBucketName(
      testStack,
      "MockSourceBucket",
      "mock-source-bucket-name"
    );

    const mockArtifactBucket = s3.Bucket.fromBucketName(
      testStack,
      "MockArtifactBucket",
      "mock-artifact-bucket-name"
    );

    const mockRepo = ecr.Repository.fromRepositoryName(
      testStack,
      "MockRepo",
      "mock-repo-name"
    );

    return new FeaturePipelineStack(app, "TestStack", {
      namespace,
      identifier,
      repository: mockRepo,
      sourceBucket: mockSourceBucket,
      artifactBucket: mockArtifactBucket,
    });
  };

  test("throws error when identifier is not provided", () => {
    expect(() => createTestStack("devcontainers/features", "")).toThrow(
      "identifier property is required"
    );
  });

  test("creates pipeline with Publish stage", () => {
    const template = Template.fromStack(createTestStack());

    template.hasResourceProperties("AWS::CodePipeline::Pipeline", {
      PipelineType: "V2",
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: "Source",
        }),
        Match.objectLike({
          Name: "Publish",
        }),
      ]),
    });
  });

  test("creates EventBridge rule for S3 object creation", () => {
    const template = Template.fromStack(createTestStack());

    template.hasResourceProperties("AWS::Events::Rule", {
      EventPattern: {
        source: ["aws.s3"],
        "detail-type": ["Object Created"],
      },
      Targets: Match.arrayWith([
        Match.objectLike({
          Arn: Match.anyValue(),
        }),
      ]),
    });
  });

  test("outputs pipeline information", () => {
    const template = Template.fromStack(createTestStack());
    template.hasOutput("PipelineNameOutput", {});
  });
});
