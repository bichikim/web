# Code Viewer development guide

[한국어 개발자 안내](./development.ko.md)

## Building and local installation

Run the following commands from the package directory after installing repository dependencies. For installation and usage, see the [user guide](./README.md).

```sh
pnpm build
codex plugin marketplace add "$PWD/dist" --json
codex plugin add codex-code-viewer@winter-love-code-viewer --json
```

`dist/plugin` contains the server, HTML, TypeScript standard declarations, `.codex-plugin/plugin.json` and `.mcp.json`. It needs no separate npm install at runtime. `dist/.agents/plugins/marketplace.json` is the local catalog pointing to this bundle.

After code changes, rebuild and run `codex plugin add codex-code-viewer@winter-love-code-viewer --json` to update the installed copy. Reopening the app may be necessary to reload the running server.

## npm publishing

The source [`package.json`](https://github.com/bichikim/web/blob/dev/packages/codex-code-viewer/package.json) controls public access, the installer command, distributed files and dependencies. Runtime libraries are bundled and listed as `devDependencies`. Builds generate executables and license notices in `dist` without a separate npm manifest. `dist/plugin` is the local installation bundle; `dist` is not committed to Git.

```sh
pnpm build
pnpm pack --pack-destination ./dist
# Inspect the tarball and verify standalone execution before publishing.
npm publish "./dist/winter-love-codex-code-viewer-<version>.tgz" --access public
```

For a new version, change only `package.json.version`, then run `pnpm build`. The [version synchronization step](./build/sync-plugin-version.ts) updates the plugin manifest and the npm version in root `.agents/plugins/marketplace.json`; commit those generated changes with `package.json`. The monorepo's `Release packages` Action decides whether to publish based on version. Sources and tags follow the repository [release rules](https://github.com/bichikim/web/blob/dev/RELEASE.md). After a successful npm publish, create and push an `@winter-love/codex-code-viewer@<version>` tag on the same source commit. Normal installation/updates use npm's `latest`, so Git tags are not part of those commands. GitHub-catalog users can select a tag with `--ref`.

The release archive check also runs [installation and runtime verification](../../scripts/npm-release/verify-code-viewer.md) against the packed Code Viewer before publishing.

## Browser preview

```sh
node --import tsx preview.ts /absolute/path/to/file.tsx
# Preview the conversation panel's workspace tree before choosing a file.
node --import tsx preview.ts /absolute/path/to/workspace --panel
# Preview the prompt when a conversation has no known workspace.
node --import tsx preview.ts /absolute/path/to/workspace --panel --empty
```

Open the printed URL in the Codex browser. A loopback server with a random-token path connects the actual built stdio MCP server to AppBridge. It supplies native file-tool inputs and host-path metadata to run the same viewer. **Host theme** tests real bridge theme-change events. Rebuild and refresh the same URL to load the updated UI; stop with `Ctrl+C`.

Expand **Chat context preview** to inspect all ranges received by the host. **Clear context** tests host consumption/removal events. This preview does not verify native viewer-menu registration or individual attachment-chip rendering.

## Verification

```sh
pnpm exec vitest run --config vitest.config.ts
pnpm exec tsc --noEmit -p tsconfig.json
```
