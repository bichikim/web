# Wallaby Tool Reference

| Tool                                 | Purpose                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `wallaby_failingTests`               | Get all failing tests with errors and stack traces                       |
| `wallaby_failingTestsForFile`        | Get failing tests for a specific file                                    |
| `wallaby_allTests`                   | Get all tests, useful when there are no failures but test IDs are needed |
| `wallaby_allTestsForFile`            | Get tests covering or executing a specific file                          |
| `wallaby_failingTestsForFileAndLine` | Get failing tests covering or executing a specific file and line         |
| `wallaby_allTestsForFileAndLine`     | Get tests covering a specific line                                       |
| `wallaby_runtimeValues`              | Inspect variable values at a code location                               |
| `wallaby_runtimeValuesByTest`        | Get runtime values for a specific test                                   |
| `wallaby_coveredLinesForFile`        | Get coverage data for a file                                             |
| `wallaby_coveredLinesForTest`        | Get lines covered by a specific test                                     |
| `wallaby_testById`                   | Get detailed test data by ID                                             |
| `wallaby_updateTestSnapshots`        | Update snapshots for a test                                              |
| `wallaby_updateFileSnapshots`        | Update all snapshots in a file                                           |
| `wallaby_updateProjectSnapshots`     | Update all snapshots in the project                                      |

## Inputs

- For file-scoped tools, pass the workspace-relative file path.
- For line-scoped tools, pass `file`, `line`, and the exact `lineContent` string from the file.
- For test-scoped tools, pass `testId` from `wallaby_failingTests` or `wallaby_allTests`.
