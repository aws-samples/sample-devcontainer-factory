---
inclusion: always
---

# Devcontainer Factory conventions

A CDK (TypeScript) app that builds, tests and publishes dev container images and
features to Amazon ECR when a zip is uploaded to S3. The README describes the
architecture.

## Layout

- `bin/` is the CDK app: it reads context, creates the stacks and applies cdk-nag.
- `lib/warehouse-stack.ts` holds the state (buckets, KMS keys, ECR repositories).
  `lib/pipeline/` has one stateless stack per image or feature, and `lib/constructs/`
  the reusable constructs.
- `assets/buildspec/` has the CodeBuild buildspecs. They get their parameters only from
  environment variables that the stacks set.
- `examples/` are inputs for the factory (zipped and uploaded), not part of the app.
- `test/unit/` has Jest tests that mirror `lib/`.

## Checks

Run these before opening a pull request. The commit hooks run the last three.

```bash
npm ci
npx tsc --noEmit
npm run lint
npm test
npx cdk synth --quiet   # needs no network or credentials; no "[Error at" lines allowed
```

- Run the CDK CLI as `npx cdk` or `npm run cdk --`. Do not assume a global `cdk`.
- Do not use `--legacy-peer-deps` or `--force`. `aws-cdk`, `aws-cdk-lib`, `constructs`
  and `cdk-nag` are pinned and must be bumped together. `cdk-nag` stays on 2.x.
- Synth prints `CloudFormation-Validate::E3050` warnings. They are known false positives.

## Git workflow

- GitHub flow: branch from an up-to-date `main`, one logical change per branch and pull
  request, never commit to `main`, delete the branch after the merge. Name branches
  `<type>/<scope>-<topic>`, for example `fix/deps-cdk-alignment`.
- Commits follow Conventional Commits, `<type>(<scope>): <subject>`. Types: `feat`,
  `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `style`, `revert`.
  The scope names the area (`deps`, `pre-commit`, `devcontainer`, `warehouse`,
  `pipeline`, `buildspec`, `steering`, ...). The subject is imperative, lowercase, has
  no final period and stays within 72 characters. The body, wrapped at 72, says why.
  Mark breaking changes with `!` and a `BREAKING CHANGE:` footer.
- The pull request title is a Conventional Commit subject. Branches can land commit by
  commit (rebase merge), so every commit must pass the checks on its own.
- Hooks in `.pre-commit-config.yaml` run on every commit and check the message. Never
  bypass them (no `--no-verify`). pre-commit refuses to run while that file has
  unstaged changes, so commit it together with the change.
- Agents: work on a branch, show the diff and the proposed commit messages and wait for
  approval before committing, and do not push unless asked.

## Code

- Prettier formats the code (`.prettierrc`). Match the surrounding code and do not
  reformat lines you did not change. New files in `bin/` and `lib/` start with the
  MIT-0 license header.
- Model with constructs, deploy with stacks. Constructs and stacks take props. Only
  `bin/` reads CDK context. Validate required props early and throw an `Error` that
  names the prop. Document props with JSDoc, including `@default`.
- Keep state in `WarehouseStack` and keep pipeline stacks stateless. Stack and construct
  IDs are part of the contract: renaming a stateful resource replaces it.
- Prefer `grant*()` over hand-written policies. A `PolicyStatement` lists explicit
  actions and resources. Set removal policies and log retention explicitly.
- A cdk-nag suppression gets a specific reason and the narrowest scope.
- Every infrastructure change gets a Jest test (`Template.fromStack`).

## Dev container inputs

- `devcontainer build` copies `privileged`, `capAdd`, `securityOpt`, `mounts`,
  `containerEnv`, `remoteUser` and the lifecycle commands (`postCreateCommand` and the
  others) into the image metadata, so users of the image can inherit them. Review them
  with care. `initializeCommand` is not copied (checked with CLI 0.91.0).
- Kiro needs a Linux image on x64 or ARM64 with glibc (no musl), a user with an absolute
  home directory, and `tar`.
- Pin tool versions in buildspecs and features, and do not pipe a downloaded script into
  a shell.
