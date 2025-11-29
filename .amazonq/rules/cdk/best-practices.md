# AWS CDK Best Practices

This document summarizes the best practices for developing and deploying cloud infrastructure with AWS CDK as outlined in the [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html).

## Organization Best Practices

- **Establish a Cloud Center of Excellence (CCoE)**: Have a team of experts responsible for training and guiding the rest of the company as they adopt CDK.
- **Define standards and policies**: Set standards for programming languages and cloud infrastructure.
- **Create a landing zone**: Define organizational units within AWS using services like AWS Control Tower.
- **Use separate accounts**: Development teams should use their own accounts for testing, with deployment to testing, integration, and production environments via CI/CD pipelines.

## Coding Best Practices

- **Start simple**: Add complexity only when requirements dictate a more complicated solution.
- **Align with AWS Well-Architected Framework**: CDK applications map to components as defined by the framework.
- **Begin with a single package**: Every application starts with a single package in a single repository.
- **Organize repositories by lifecycle or ownership**: Move code into separate repositories based on code lifecycle or team ownership.
- **Keep infrastructure and runtime code together**: Infrastructure and runtime code should live in the same package.

## Construct Best Practices

- **Model with constructs, deploy with stacks**: Use constructs for logical units and stacks for deployment.
- **Configure with properties and methods**: Avoid environment variable lookups inside constructs and stacks.
- **Unit test your infrastructure**: Write tests to confirm that generated templates look as expected.
- **Preserve logical IDs of stateful resources**: Changing logical IDs results in resource replacement.
- **Don't rely solely on constructs for compliance**: Use AWS features like service control policies and permission boundaries to enforce security guardrails.

## Application Best Practices

- **Make decisions at synthesis time**: Use your programming language's features rather than CloudFormation conditions.
- **Use generated resource names**: Avoid hardcoding resource names to enable multiple deployments and easier updates.
- **Define removal policies and log retention**: Specify appropriate policies to avoid unnecessary data storage and costs.
- **Separate applications into multiple stacks based on deployment needs**:
  - Keep stateful resources (databases) separate from stateless resources
  - Apply termination protection to stateful stacks
  - Keep resources together unless there's a reason to separate them
- **Commit cdk.context.json**: Ensure deterministic behavior by committing context values to version control.
- **Let CDK manage roles and security groups**: Use `grant()` methods for minimal permissions.
- **Model all production stages in code**: Create separate stacks for each environment with appropriate configuration.
- **Measure everything**: Create metrics, alarms, and dashboards for all aspects of your deployed resources.

## Key Principles

1. **Determinism**: CDK apps should produce the same result whenever deployed to a given environment.
2. **No side effects during synthesis**: Changes to infrastructure should happen only during deployment.
3. **Complete versioning**: Every commit should represent a complete, consistent, deployable version of your application.
4. **Minimal permissions**: Use CDK's convenience methods to create minimally-scoped permissions.
5. **Comprehensive testing**: Unit test infrastructure to ensure templates are generated as expected.
