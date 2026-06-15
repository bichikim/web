---
name: audit
description: Analyze project vulnerabilities with pnpm audit and resolve them automatically when a fix version is available; report unfixable deep dependency issues.
disable-model-invocation: true
---

# Audit dependencies

Analyze project vulnerabilities using `pnpm audit` and attempt to resolve them.

## Task guide

1. Run `pnpm audit` to identify vulnerabilities.
2. Attempt to resolve as much as possible automatically.
3. Only attempt updates when a fix version is available in the vulnerability info.
4. Stop when no resolution is possible.
5. Ignore `<0.0.0` and similar placeholders — no fix version exists yet.
6. For deep vulnerabilities that cannot be resolved (e.g. `lerna>rimraf` version is vulnerable), report them instead of attempting to fix.

After resolution attempts, run `pnpm audit` again and summarize what was fixed and what remains.
