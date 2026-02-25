# Audit Command

Command: Analyze project vulnerabilities using pnpm audit and attempt to resolve them

## Task Guide

- Attempt to resolve as much as possible automatically
- Only attempt updates when a fix version is available in the vulnerability info
- Stop when no resolution is possible
- Ignore <0.0.0 etc. as no fix version exists yet
- For deep vulnerabilities that cannot be resolved (e.g. lerna>rimraf version is vulnerable), report them instead of attempting to fix
