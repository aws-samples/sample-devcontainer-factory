import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import { Template, Match } from "aws-cdk-lib/assertions";
import { BuildProject } from "../../../lib/constructs/build-project";

describe("BuildProject", () => {
  test("creates project with default values", () => {
    // ARRANGE
    const stack = new cdk.Stack();

    // ACT
    new BuildProject(stack, "TestProject", {});

    // ASSERT
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::CodeBuild::Project", {
      Environment: {
        Type: "ARM_CONTAINER",
        ComputeType: "BUILD_GENERAL1_SMALL",
        Image: Match.anyValue(),
        PrivilegedMode: true,
      },
      TimeoutInMinutes: 120, // 2 hours
      Cache: {
        Type: "LOCAL",
        Modes: ["LOCAL_DOCKER_LAYER_CACHE"],
      },
    });

    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      ComparisonOperator: "GreaterThanOrEqualToThreshold",
      EvaluationPeriods: 1,
      Threshold: 1,
      TreatMissingData: "notBreaching",
    });
  });

  test("creates project with custom values", () => {
    // ARRANGE
    const stack = new cdk.Stack();
    const role = new iam.Role(stack, "TestRole", {
      assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
    });
    const key = new kms.Key(stack, "TestKey");

    // ACT
    new BuildProject(stack, "TestProject", {
      role,
      encryptionKey: key,
      buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
      computeType: codebuild.ComputeType.LARGE,
      buildSpecPath: "./assets/buildspec/build.yml", // Use default buildspec path
      timeout: cdk.Duration.hours(3),
      description: "Custom build project",
      environmentVariables: {
        TEST_VAR: { value: "test-value" },
      },
    });

    // ASSERT
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::CodeBuild::Project", {
      Description: "Custom build project",
      Environment: {
        Type: "LINUX_CONTAINER",
        ComputeType: "BUILD_GENERAL1_LARGE",
        PrivilegedMode: true,
        EnvironmentVariables: [
          {
            Name: "TEST_VAR",
            Value: "test-value",
          },
        ],
      },
      TimeoutInMinutes: 180, // 3 hours
      EncryptionKey: {
        "Fn::GetAtt": [Match.stringLikeRegexp("TestKey"), "Arn"],
      },
    });
  });
});
