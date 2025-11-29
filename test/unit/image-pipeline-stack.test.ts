import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { Template, Match } from "aws-cdk-lib/assertions";
import { ImagePipelineStack } from "../../lib/pipeline/image-pipeline-stack";

describe("ImagePipelineStack", () => {
  const createTestStack = (
    namespace = "devcontainers/images",
    identifier = "test-container"
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

    return new ImagePipelineStack(app, "TestStack", {
      namespace,
      identifier,
      repository: mockRepo,
      sourceBucket: mockSourceBucket,
      artifactBucket: mockArtifactBucket,
    });
  };

  test("throws error when identifier is not provided", () => {
    expect(() => createTestStack("devcontainers/images", "")).toThrow(
      "identifier property is required"
    );
  });

  test("creates pipeline with correct stages", () => {
    const template = Template.fromStack(createTestStack());

    template.hasResourceProperties("AWS::CodePipeline::Pipeline", {
      PipelineType: "V2",
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: "Source",
          Actions: Match.arrayWith([
            Match.objectLike({
              ActionTypeId: {
                Category: "Source",
                Provider: "S3",
              },
            }),
          ]),
        }),
        Match.objectLike({
          Name: "Build",
          Actions: Match.arrayWith([
            Match.objectLike({
              Name: "Build_ARM64",
            }),
            Match.objectLike({
              Name: "Build_AMD64",
            }),
          ]),
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
