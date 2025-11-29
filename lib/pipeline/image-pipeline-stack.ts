/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * image-pipeline-stack - stateless resources stack to build dev container
 * images.
 */

import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { Construct } from "constructs";
import {
  BasePipelineStack,
  BasePipelineStackProps,
} from "./base-pipeline-stack";

export class ImagePipelineStack extends BasePipelineStack {
  constructor(scope: Construct, id: string, props: BasePipelineStackProps) {
    super(scope, id, props);
  }

  configurePipeline() {
    const amd64BuildProject = this.createBuildProject("AMD64BuildProject", {
      buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
      computeType: codebuild.ComputeType.LARGE,
      buildSpecPath: "./assets/buildspec/build.yml",
      description: "AMD64 build environment for devcontainers",
    });

    const arm64BuildProject = this.createBuildProject("ARM64BuildProject", {
      computeType: codebuild.ComputeType.LARGE,
      buildSpecPath: "./assets/buildspec/build.yml",
      description: "ARM64 build environment for devcontainers",
    });

    const manifestBuildProject = this.createBuildProject(
      "ManifestBuildProject",
      {
        buildSpecPath: "./assets/buildspec/manifest.yml",
        description: "Multi-architecture manifest creation for devcontainers",
      }
    );

    const testAmd64BuildProject = this.createBuildProject(
      "TestAMD64BuildProject",
      {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
        buildSpecPath: "./assets/buildspec/test.yml",
        description: `Test container images on AMD64 architecture`,
      }
    );

    const testArm64BuildProject = this.createBuildProject(
      "TestARM64BuildProject",
      {
        buildSpecPath: "./assets/buildspec/test.yml",
        description: "Test container images on ARM64 architecture",
      }
    );

    const releaseBuildProject = this.createBuildProject("ReleaseBuildProject", {
      buildSpecPath: "./assets/buildspec/release.yml",
      description: "Release container images",
    });

    const environmentVariables: {
      [name: string]: codebuild.BuildEnvironmentVariable;
    } = {
      AWS_REGISTRY: { value: this.registry },
      AWS_REGISTRY_IMAGE: {
        value: `${this.registry}/${this.repository.repositoryName}`,
      },
      IMAGE_TAG: { value: "#{codepipeline.PipelineExecutionId}" },
    };

    this.pipeline.addStageActions("Build", [
      {
        actionName: "Build_ARM64",
        project: arm64BuildProject,
        environmentVariables: {
          ...environmentVariables,
          IMAGE_TAG_SUFFIX: { value: "-arm64" },
        },
      },
      {
        actionName: "Build_AMD64",
        project: amd64BuildProject,
        environmentVariables: {
          ...environmentVariables,
          IMAGE_TAG_SUFFIX: { value: "-amd64" },
        },
      },
    ]);

    this.pipeline.addStageActions("Manifest", [
      {
        actionName: "Create_Manifest",
        project: manifestBuildProject,
        environmentVariables,
      },
    ]);

    this.pipeline.addStageActions("Test", [
      {
        actionName: "Test_ARM64",
        project: testArm64BuildProject,
        environmentVariables,
      },
      {
        actionName: "Test_AMD64",
        project: testAmd64BuildProject,
        environmentVariables,
      },
    ]);

    this.pipeline.addStageActions("Release", [
      {
        actionName: "Release_Images",
        project: releaseBuildProject,
        environmentVariables: {
          ...environmentVariables,
          IMAGE_REPO_NAME: { value: this.repository.repositoryName },
        },
      },
    ]);
  }
}
