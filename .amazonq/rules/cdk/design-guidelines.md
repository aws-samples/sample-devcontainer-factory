# AWS CDK Design Guidelines

This document summarizes the design guidelines for AWS CDK constructs as outlined in the [AWS CDK GitHub repository](https://github.com/aws/aws-cdk/blob/main/docs/DESIGN_GUIDELINES.md).

## Core Design Principles

- **Do not future proof** - Add complexity only when requirements dictate
- **No fluent APIs** - Avoid chained method calls for configuration
- **User-centric terminology** - APIs should use language familiar to users
- **Multiple approaches are valid** - Different ways to achieve the same goal is legitimate
- **Maintain invariants** - Ensure consistency in your constructs
- **Minimize conditionals** - Fewer "if statements" leads to more maintainable code

## API Design Guidelines

### Props and Configuration

- **Detailed documentation** - Every prop must have detailed documentation
- **Use enums for choices** - When relevant, use enums to represent multiple choices
- **Avoid union types** - Do not use TypeScript union types in construct APIs
- **Configuration mutation** - Use `@config` annotation for methods that modify construct configuration

### Resource Attributes

- **Expose all CloudFormation attributes** - AWS constructs must expose all resource attributes
- **Use @attribute tag** - All properties representing resource attributes must include this JSDoc tag
- **Type name prefix** - All attribute names must begin with the type name (e.g., `bucketArn` not just `arn`)
- **Read-only properties** - Resource attributes must be represented as readonly properties

### Resource Factories

- **Secondary resources** - Provide factory methods on primary resources to create associated secondary resources
- **Method naming** - Use "add" prefix for factory methods (e.g., `addLayer`, `addResource`)
- **Return type** - Factory methods should return the created resource instance

### Resource Imports

- **From methods** - Provide static "from" methods to import unowned resources
- **Method signature** - First arg: scope, second arg: id string, returns interface implementation
- **FromAttributes** - Provide a method to explicitly supply values to all resource attributes

### IAM Roles and Policies

- **Role prop** - Expose optional `role` prop of type `iam.IRole`
- **Role property** - Expose `role` property and extend `iam.IGrantable`
- **AddToRolePolicy** - Expose method to add statements to the role's policy

### Resource Policies

- **Policy prop** - Allow initializing resource with a specified policy
- **AddToResourcePolicy** - Include method to add statements to the resource policy

### VPC Configuration

- **VPC props** - Include `vpc` and `vpcSubnetSelection` props for resources that can be placed in a VPC
- **Default to private subnets** - Place resources in all private subnets by default

### Grants

- **Grant methods** - Expose on interface with "grant" prefix
- **Method signature** - First arg: grantee, returns `iam.Grant`
- **Common use cases** - Include grant methods for common operations

### Metrics

- **Metric methods** - Include methods to access CloudWatch metrics
- **Generic method** - Provide `metric(metricName, options)` method
- **Named metrics** - Provide methods for specific metrics with `metricXxx` naming

### Events

- **Event methods** - Provide "onXxx" methods for resources that emit events
- **Method signature** - `onXxx(id, target, options)` returning `cloudwatch.EventRule`
- **Generic method** - Include `onEvent` method for custom events

### Integrations

- **Interface-based** - Model integrations using interfaces exported by the central module
- **Add method** - Define "addXxx" method on construct interface
- **Module organization** - Place integrations in dedicated modules (e.g., `aws-lambda-event-sources`)

### State Management

- **State annotation** - Include `@stateful` or `@stateless` JSDoc annotation
- **Removal policy** - Stateful resources must have a `removalPolicy` prop

### Tags and Secrets

- **Tags prop** - Include optional `tags` hash in props for taggable resources
- **Secret values** - Use `cdk.SecretValue` for passwords, tokens, and other secrets

## Implementation Guidelines

### Construct IDs

- **Stability** - Treat construct hierarchy and IDs as part of the external contract
- **Primary resource** - Use the ID "Resource" for the primary resource
- **Avoid concatenation** - Use nested constructs for namespacing instead of concatenating IDs

### Error Handling

- **Avoid errors if possible** - Prefer doing the right thing over raising errors
- **Input validation** - Validate inputs early and throw exceptions for invalid values
- **Error messages** - Write user-focused error messages that explain what went wrong and how to fix it
- **Never catch exceptions** - All CDK errors are unrecoverable

### Documentation

- **All public APIs** - Document all public APIs when first introduced
- **No duplicate docs** - Do not add documentation on overrides/implementations
- **JSDoc tags** - Use `@param`, `@returns`, `@default`, `@see`, `@example`
- **README** - Include maturity level, examples for common use cases

### Testing

- **Unit tests** - Test utility functions and object models separately from constructs
- **Integration tests** - Create deployable CDK apps under `test/integ.xxx.ts`

### Naming Conventions

- **Classes**: PascalCase
- **Properties**: camelCase
- **Methods**: camelCase
- **Interfaces**: IMyInterface
- **Structs**: MyDataStruct
- **Enums**: PascalCase, **Members**: SNAKE_UPPER

### Coding Style

- **Indentation**: 2 spaces
- **Line length**: 150
- **String literals**: Use single-quotes or backticks
- **Semicolons**: End each statement and declaration with semicolons
- **Comments**: Start with lower-case, end with a period
