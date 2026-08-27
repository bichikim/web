# Execution Routing

## Unit Tests

- Terra owns ordinary source analysis, test writing, execution, failure repair, and coverage checks.
- Luna only finds untested executable files, enumerates repetitive cases, prepares straightforward fixtures, or runs existing tests mechanically.
- The parent or Sol owns expected behavior, complex async/concurrency, timers, storage, mock validity, and final meaningful-coverage judgment. A 100% target requires complete executable-file inventory and meaningful assertions, not line coverage alone.

## Package Scripts

A finite, non-interactive existing script with no intermediate judgment is a Luna candidate. Inspect its exact definition and pass the package directory and command. Lint, format checks, typechecks, builds, coverage, and tests qualify; dev/Storybook servers, watch/UI, generators, cleanup, formatting/fixes, installs/lifecycle, deploy/publish/Chromatic, secrets, and uninspected scripts do not.

The worker runs only listed commands—no edits, diagnosis, fixes, retries, installs, or nested agents—and returns command, exit code, elapsed time when available, outcome, decisive failure lines, and sandbox/tooling blockers. The parent decides the scope and route after failure.
