---
name: audit
description: Audit dependency advisories with pnpm audit on explicit invocation. Apply available fixes when authorized and report unresolved advisories.
disable-model-invocation: true
---

# Audit dependencies

Run `pnpm audit`. For a report-only request, report advisories and available fixes. When the full workflow is explicitly invoked or fixes are otherwise authorized, apply only available fixes and rerun the audit. Treat `<0.0.0` and similar placeholders as unavailable fixes. Report unresolved transitive advisories without forcing upgrades.
