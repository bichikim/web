# Code Viewer archive verification

Run from a checkout with workspace dependencies installed, using Node 24+, npm (`npx`), Codex CLI, `tar` and OpenSSL on macOS or Linux:

```sh
node scripts/npm-release/verify-code-viewer.mjs /absolute/path/to/package.tgz [report-directory]
```

`CODEX_BINARY` selects the Codex executable. The archive determines the package version; the verifier does not depend on a particular checkout path or a published version. Reports default to `node_modules/.cache/code-viewer-install` in the checkout.

The verifier serves the supplied tarball through a temporary HTTPS registry with its own fixture CA. It uses isolated npm configuration, empty caches and temporary Codex homes to check fresh installation, progress output, repeated installation, missing development marketplace cleanup, unrelated registration preservation, and rollback after download failures with and without a previous catalog. Every packed file's SHA-256 must match its installed copy.

It then follows the installed plugin's MCP configuration to start its bundled server without repository runtime dependencies or external language tools, checks its viewer resource, and exercises TypeScript references through the installed navigation worker. The repository's MCP SDK is used only by the test client. Other language analyzers and native desktop panel interactions are outside this check.

A failed assertion exits nonzero. `verification.json` records the archive identity, completed checks and failure details; `installation.log` records installer output. Temporary caches, configuration, certificates, servers and fixture projects are removed after the run. The user's Codex configuration is not used.

The [release runner](./run.mjs) invokes this check on the exact Code Viewer archive produced by `packReleases`, in both `pack` and `publish` modes. All archives are verified before the first package is published. The [release workflow](../../.github/workflows/npm-release.yml) provisions the pinned Codex CLI for both jobs. Running the verifier or `pack` does not publish, create tags or push changes.
