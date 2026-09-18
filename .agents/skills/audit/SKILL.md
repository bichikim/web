---
name: audit
description: Audit project vulnerabilities with pnpm audit, apply available fixes, and report unfixable deep dependencies.
disable-model-invocation: true
---

# Audit dependencies

Run `pnpm audit`, apply only available fixes, then run it again. Ignore
`<0.0.0` and similar no-fix placeholders; report unresolved deep dependencies
instead of forcing upgrades. Summarize fixed and remaining vulnerabilities.
