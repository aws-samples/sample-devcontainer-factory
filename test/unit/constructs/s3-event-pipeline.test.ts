import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Template, Match } from "aws-cdk-lib/assertions";
import { S3EventPipeline } from "../../../lib/constructs/s3-event-pipeline";

describe("S3EventPipeline", () => {
  const createTestPipeline = () => {
    const stack = new cdk.Stack();

    // Create required resources
    const sourceBucket = new s3.Bucket(stack, "TestSourceBucket");
    const artifactBucket = new s3.Bucket(stack, "TestArtifactBucket");
    const role = new iam.Role(stack, "TestRole", {
      assumedBy: new iam.ServicePrincipal("codepipeline.amazonaws.com"),
    });

    const amd64BuildProject = new codebuild.PipelineProject(
      stack,
      "AMD64Project"
    );
    const arm64BuildProject = new codebuild.PipelineProject(
      stack,
      "ARM64Project"
    );

    const pipeline = new S3EventPipeline(stack, "TestPipeline", {
      sourceBucket,
      sourceBucketKey: "test-container.zip",
      artifactBucket,
      role,
    });

    // Add stages using the addStageActions method
    pipeline.addStageActions("Build", [
      {
        actionName: "Build_AMD64",
        project: amd64BuildProject,
        environmentVariables: {
          TEST_VAR: { value: "test-value" },
        },
      },
      {
        actionName: "Build_ARM64",
        project: arm64BuildProject,
      },
    ]);

    return { stack, pipeline };
  };

  test("creates pipeline with source stage", () => {
    const { stack } = createTestPipeline();
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::CodePipeline::Pipeline", {
      Stages: Match.arrayWith([
        {
          Name: "Source",
          Actions: [
            Match.objectLike({
              ActionTypeId: {
                Category: "Source",
                Provider: "S3",
              },
              Configuration: {
                S3Bucket: {
                  Ref: Match.stringLikeRegexp("TestSourceBucket"),
                },
                S3ObjectKey: "test-container.zip",
              },
              Name: "S3Source",
              OutputArtifacts: [
                {
                  Name: Match.anyValue(),
                },
              ],
              Namespace: "SourceVariables",
            }),
          ],
        },
      ]),
    });
  });

  test("creates pipeline with build stage", () => {
    const { stack } = createTestPipeline();
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::CodePipeline::Pipeline", {
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: "Build",
          Actions: [
            Match.objectLike({
              Name: "Build_AMD64",
              ActionTypeId: {
                Category: "Build",
                Provider: "CodeBuild",
              },
              Configuration: {
                ProjectName: {
                  Ref: Match.stringLikeRegexp("AMD64Project"),
                },
                EnvironmentVariables: Match.anyValue(),
              },
            }),
            Match.objectLike({
              Name: "Build_ARM64",
              ActionTypeId: {
                Category: "Build",
                Provider: "CodeBuild",
              },
              Configuration: {
                ProjectName: {
                  Ref: Match.stringLikeRegexp("ARM64Project"),
                },
              },
            }),
          ],
        }),
      ]),
    });
  });

  test("creates EventBridge rule for S3 object creation", () => {
    const { stack } = createTestPipeline();
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Events::Rule", {
      EventPattern: {
        source: ["aws.s3"],
        "detail-type": ["Object Created"],
        detail: {
          bucket: {
            name: [
              {
                Ref: Match.stringLikeRegexp("TestSourceBucket"),
              },
            ],
          },
          object: {
            key: ["test-container.zip"],
          },
        },
      },
    });
  });
});
