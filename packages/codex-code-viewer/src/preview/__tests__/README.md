# Viewer E2E

These tests launch the actual preview, bundled MCP server and built UI in owned temporary directories. Chromium and WebKit exercise the user interface. Only the host attachment surface is simulated by the existing preview; this does not prove delivery into a live Codex chat.

Build the package first when production sources change. From the repository root:

```sh
pnpm exec vitest run --config vitest.integration.config.mts --project integration packages/codex-code-viewer/src/preview/__tests__
```

The fixture releases sessions, browser and server after success and failure. Saving preferences must finish before reloading: a visible change alone does not prove persistence. Failure messages include the final viewer text.

See the scenario assertions in [memos](memos.integration.ts), [native gestures](gestures.integration.ts), [files](files.integration.ts), [limits](limits.integration.ts), [spreadsheets](spreadsheets.integration.ts) and [streams](streams.integration.ts). These cover selected boundaries and real interactions; they are not a claim of coverage for every document format or every host integration.
