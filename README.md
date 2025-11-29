## Devcontainer Factory

An automated factory for building and publishing devcontainer images and features to Amazon ECR. The factory uses event-driven architecture to trigger builds when configurations are uploaded to S3.

## Architecture

![Architecture Diagram](./assets/build-infrastructure.svg)

The application consists of two main components:

### Warehouse Stack (Stateful)

The warehouse stack provides persistent infrastructure and helper functions:

- **Source Bucket**: S3 bucket with EventBridge notifications enabled for storing devcontainer configurations (.zip files)
- **Artifact Bucket**: S3 bucket for CodePipeline artifacts with 7-day lifecycle policy
- **KMS Keys**: Encryption keys for S3 buckets and ECR repositories
- **ECR Repositories**: Container registries for images and features with image scanning and lifecycle policies

### Pipeline Stacks (Stateless)

Each devcontainer image or feature gets its own pipeline stack:

**Image Pipeline** - Multi-architecture container builds:

- Build stage: Parallel ARM64 and AMD64 builds using CodeBuild
- Manifest stage: Creates multi-arch manifest
- Test stage: Parallel architecture-specific testing
- Release stage: Tags and publishes images to ECR

**Feature Pipeline** - Devcontainer feature publishing:

- Publish stage: Builds and publishes features to shared ECR repository with semantic versioning

## How It Works

1. **Upload Configuration**: Place a devcontainer configuration (.zip) into the source S3 bucket at `devcontainers/{identifier}.zip`
2. **EventBridge Trigger**: S3 Object Created event triggers EventBridge rule
3. **Pipeline Execution**: CodePipeline automatically starts with the uploaded configuration
4. **Build Process**: CodeBuild projects execute buildspecs to build container images or features
5. **Push to ECR**: Successfully built artifacts are pushed to their respective ECR repositories

## Deployment

Deploy the factory and pipeline stacks:

```bash
# Deploy warehouse and image pipeline
cdk deploy --context namespace=devcontainers --context images=python,node --all

# Deploy warehouse and feature pipeline
cdk deploy --context namespace=devcontainers --context features=amazon-q-cli --all
```

## Operation

After deployment, the factory operates automatically:

1. Get the source bucket name from CloudFormation outputs
2. Package your devcontainer configuration as a .zip file
3. Upload to S3: `aws s3 cp config.zip s3://{bucket-name}/devcontainers/images/{identifier}.zip`
4. Monitor pipeline execution in CodePipeline console
5. Pull images from ECR: `docker pull {account}.dkr.ecr.{region}.amazonaws.com/devcontainers/images/{name}:latest`

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
