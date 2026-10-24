# Code Viewer user guide

[한국어 사용 설명서](./README.ko.md)

Code Viewer opens code, documents and media beside your Codex conversation. Use it to find related code, edit text files and attach selected code or changes to your next message.

The demos below show Code Viewer 0.5.0 in Codex with the English UI.

See [Supported formats](#supported-formats) for the features available for each file type.

## 1. Install and open

You need Node.js 24 or later and npm. For Codex, also use the Codex desktop app and a CLI supporting the `plugin` subcommand. If the CLI is missing, the installer asks permission to install it globally with npm, then continues after installation. Non-interactive execution installs a missing CLI only with `install --install-codex`. To install or update it yourself:

```sh
npm install -g @openai/codex
```

Install Code Viewer:

```sh
npx @winter-love/codex-code-viewer@latest install
```

In the terminal, choose **Codex**. For automation, use `install --target codex`; non-interactive execution defaults to Codex.

Fully quit and reopen Codex. In a project conversation, open the right panel's new-tab menu and select **Code Viewer**. The default file viewer's **Open** menu launches external applications.

The viewer connects to the conversation's workspace when its path is available. Otherwise, enter a file's absolute path, such as `/Users/yourname/projects/my-project/src/main.tsx`, and press Enter.

In Codex, enter an absolute folder path under **Settings → Workspace** and select **Apply** to remember it only for Code Viewer in the current chat. It is restored when reopening the viewer or restarting the app, without changing the Codex chat’s own working directory. Unsaved changes require choosing whether to save, discard, or keep editing.

To update, run the same installation command and reopen Codex. Check the installation with:

```sh
codex plugin list --json --marketplace winter-love-code-viewer-npm
```

Set `CODEX_HOME` if you use another Codex configuration directory. If the CLI is not on `PATH`, set `CODEX_BINARY` to its executable path.

### Language

The default language is English. In **Settings → Language**, choose **English**, **한국어**, **日本語**, **简体中文**, or **Español**. **Automatic** follows the app language. Unsupported languages and missing translations use English. Your selection is remembered.

## 2. Open and find files

- **Open a path:** Enter an absolute path, or a relative path within the connected workspace, and press Enter or **Open file**. To jump to a position, use `src/main.tsx:20:5`.
- **Search by name:** Press `Cmd/Ctrl+P` and enter a filename or part of its path. Select a result with Up/Down and Enter, or click it. Escape closes results.
- **Browse folders:** Use **File tree** beside search. Click a folder to expand it or a file to open it. **Filter files** narrows the tree by path; **Reveal current file** clears the filter and scrolls to the open file.
- **Return to a file:** Use the back/forward buttons or `Alt+←/→`.

### Browse the file tree

![Browse the file tree](https://raw.githubusercontent.com/bichikim/web/97cc070dac551d6e898a66a0be97af66730ece2c/packages/codex-code-viewer/docs/recordings/codex/0.5.0/file-tree.gif)

History skips deleted files unless a retained draft can be reopened and saved to recreate them. Deleting the current file preserves other visits. Change notifications or refresh make externally restored files available again. Other read errors are reported instead of skipped.

Drag the divider to resize the tree. With the divider focused, Left/Right changes its width and Home/End selects minimum/maximum width. With tree focus, Up/Down and Home/End select entries; Left/Right collapses/expands folders. Right-click or `Shift+F10` opens an entry's menu.

Reopening a file in the same tab restores its selection, scrolling and applicable preview, zoom or page settings. An explicit line/column destination takes priority. The viewer remembers the 64 most recent files per workspace.

## 3. Read and navigate code

In reading mode, click an import path to open its module, or a symbol usage to open its definition. Click a definition name to list its usages. Results are grouped by file; select a result to navigate. If there are multiple definitions, choose one from the list.

### Follow an import

![Follow an import](https://raw.githubusercontent.com/bichikim/web/97cc070dac551d6e898a66a0be97af66730ece2c/packages/codex-code-viewer/docs/recordings/codex/0.5.0/import.gif)

### Go to definition

![Go to definition](https://raw.githubusercontent.com/bichikim/web/97cc070dac551d6e898a66a0be97af66730ece2c/packages/codex-code-viewer/docs/recordings/codex/0.5.0/definition.gif)

### Find references

![Find references](https://raw.githubusercontent.com/bichikim/web/97cc070dac551d6e898a66a0be97af66730ece2c/packages/codex-code-viewer/docs/recordings/codex/0.5.0/references.gif)

Definition and usage lists display verified results as the search proceeds. Filter file paths beside the title, collapse file groups, or use the right-hand navigation button to open a file.

Use the arrows beside line numbers to fold multiline functions, objects, classes and markup in reading and editing views. Click **…** to expand a folded block. Search and definition/usage navigation reveal hidden destinations. Small-file folds are restored in the same tab and reset when the source changes. Python, Ruby and Rust folding follows indentation.

### Fold and unfold code

![Fold and unfold code](https://raw.githubusercontent.com/bichikim/web/97cc070dac551d6e898a66a0be97af66730ece2c/packages/codex-code-viewer/docs/recordings/codex/0.5.0/fold.gif)

Definition and usage navigation supports TypeScript, JavaScript, Python, Ruby and Rust. JSON/JSONC/JSON5 supports file-path navigation only. Other highlighted formats do not provide symbol navigation. Language requirements are listed under [Navigation setup](#navigation-setup).

While editing or reading an unsaved draft as source, a normal click places the cursor. Use `Cmd/Ctrl+click` or `F12` for navigation in these views; use arrow keys and Enter in a result list and Escape to close it.

Press `Cmd/Ctrl+F` to find literal text without case sensitivity. Enter/Shift+Enter moves between matches; Escape closes search. Markdown and CSV/TSV switch to source mode for this search. PDF uses its own document search.

## 4. Edit and save text

1. Open an editable file and choose **Edit** in the document toolbar.
2. Make changes. Use `Cmd/Ctrl+Z` to undo and `Cmd/Ctrl+Shift+Z` to redo.
3. Choose **Save** or press `Cmd/Ctrl+S`. There is no autosave or automatic formatting.

### Edit and save text

![Edit and save text](https://raw.githubusercontent.com/bichikim/web/97cc070dac551d6e898a66a0be97af66730ece2c/packages/codex-code-viewer/docs/recordings/codex/0.5.0/edit-save.gif)

See [Supported formats](#supported-formats) for editable file types. Markdown and CSV/TSV are edited as source.

You can move between files without losing drafts. Toggle **Edit** off to read unsaved content without editing it. For Markdown and CSV/TSV, turn **Edit** off to access **Preview / Source**; previews include unsaved content. To discard a draft, turn **Edit** on and choose **⋯ → Discard changes**.

TS/JS and JSON navigation includes unsaved changes from multiple files. Python, Ruby and Rust include changes from the current file only; save changes to other files before navigating to them.

If another program changes the original, saving is rejected and your draft remains. Attach its changes to chat for review, or discard it to reload the original. If the file was deleted externally, **Save** recreates it at the same path; **Discard changes** removes the draft and navigates to another visited file when available. If another program restores the file first, saving reports a conflict.

When you change workspace or Codex requests viewer closure, choose save-all, discard or continue editing. Save before quitting Codex.

## 5. Add files and changes to chat

| What to attach       | Action                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Whole file or folder | Right-click it in the tree and choose **Add to chat**. This attaches its path, including media or files the viewer cannot open.      |
| Code range           | Drag across text and choose **Add to chat** from the context menu. The path and start/end lines and columns accompany the selection. |
| Unsaved changes      | While editing, choose **⋯ → Add changes to chat** to attach the current file's diff.                                                 |

In the reading view without an unsaved draft, you can also select lines by clicking or dragging across line numbers, or Shift-clicking another number. In the editor, drag across the text.

Editor selections include unsaved content. Tree attachments refer to the file on disk. A diff compares against the last content read or saved and captures changes at the moment you attach it; attach again after further edits.

Attachments accumulate for the next message, including ranges from multiple files. Saving and sending the message are separate actions. Code Viewer does not send messages automatically.

Select text, then choose **Copy code** or **Copy** from its context menu to copy without line numbers. Use **Copy path** in the tree to copy an absolute path.

## 6. Manage files and folders

Use **New file** or **New folder** in the tree toolbar. A selected folder becomes the destination; a selected file uses its parent. An empty workspace uses its root. The name dialog shows the destination, and existing entries are never overwritten.

### Create a file

![Create a file](https://raw.githubusercontent.com/bichikim/web/97cc070dac551d6e898a66a0be97af66730ece2c/packages/codex-code-viewer/docs/recordings/codex/0.5.0/create-file.gif)

Right-click a file or folder for **Rename**, **Copy**, **Cut**, **Paste** or **Delete**. With tree focus, `Cmd/Ctrl+C`, `Cmd/Ctrl+X`, `Cmd/Ctrl+V` and Delete are also available. Copy/cut uses an internal clipboard within this viewer's workspace. Paste on a folder places entries inside it; paste on a file uses its parent. The empty-space menu pastes at the workspace root. Copy collisions create a copy name; cut/rename collisions report an error.

Copied entries remain available for repeated paste, including after navigating between files in the same workspace. Cut entries clear after a successful move. Paste actions are disabled when no file/folder or code content is available.

**Deletion is permanent and bypasses the trash.** Confirm the target in the dialog. Save or discard affected drafts before renaming, moving or deleting entries. The workspace root, symlinks and folders containing `.git`, `.codex`, `.aws` or `.ssh` are protected. Operations can handle up to 10,000 entries at a time. If the source changes during an operation, check its contents before trying again.

## Supported formats

Use the table below to check viewing, navigation and editing support for each format.

| Format                  | Extensions / filenames                                                         | Viewing and navigation                                                            | Editable |
| ----------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | -------- |
| TypeScript / JavaScript | `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs`                   | Highlighting, imports, definitions and usages                                     | Yes      |
| Python                  | `.py`, `.pyi`                                                                  | Highlighting, imports, definitions and usages                                     | Yes      |
| Ruby                    | `.rb`, `.rake`, `.gemspec`, `Gemfile`, `Rakefile`                              | Highlighting, require paths, definitions and usages                               | Yes      |
| Rust                    | `.rs`                                                                          | Highlighting, modules, definitions and usages                                     | Yes      |
| JSON                    | `.json`, `.jsonc`, `.json5`                                                    | Highlighting and file-path values; no symbol navigation                           | Yes      |
| Configuration           | `.yaml`, `.yml`, `.toml`, `Cargo.lock`, `.ini`, `.conf`, `.cfg`, `.properties` | Highlighting; no symbol navigation                                                | Yes      |
| Stylesheets             | `.css`, `.scss`, `.sass`, `.less`                                              | Highlighting; no symbol navigation                                                | Yes      |
| Components / markup     | `.vue`, `.svelte`, `.astro`, `.html`, `.htm`, `.xml`                           | Highlighted source; no symbol navigation or execution                             | Yes      |
| Markdown                | `.md`, `.markdown`, `.mdx`                                                     | Preview/source, tables, task lists, relative links and images                     | Source   |
| CSV / TSV               | `.csv`, `.tsv`                                                                 | Table/source, sorting, filtering and pagination                                   | Source   |
| Plain text              | Other UTF-8 files, including extensionless files and permitted dotfiles        | Line numbers, selection and search; no language highlighting or symbol navigation | Yes      |
| PDF                     | `.pdf`                                                                         | Pages, zoom, text selection and document search                                   | No       |
| Word / Excel            | `.docx`, `.xlsx`                                                               | Document preview / sheet selection and table controls                             | No       |
| SVG                     | `.svg`                                                                         | Image preview / highlighted XML source, search and range selection                | No       |
| Images                  | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.bmp`, `.ico`              | Zoom and pan                                                                      | No       |
| Video                   | `.mp4`, `.m4v`, `.webm`, `.mov`, `.ogv`                                        | Playback controls                                                                 | No       |
| Audio                   | `.mp3`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.oga`, `.opus`, `.flac`, `.weba`      | Playback controls                                                                 | No       |

Only `Cargo.lock` uses TOML highlighting; other `.lock` files are plain text. `.conf` and `.cfg` use INI-style highlighting. Use the tree or path input to open extensionless files.

### Navigation setup

- **TypeScript / JavaScript:** Uses the TS7 engine. npm installations download the pinned engine for your OS from the npm registry when navigation first prepares, verify its SHA-512 checksum, and cache it for offline reuse. Background preparation starts when the workspace opens, and verified results are delivered progressively. Uses the nearest tsconfig, including `paths`, relative imports and barrel exports. Bundler-only aliases, browser public URLs and computed paths may not resolve.
- **Python:** No separate analyzer installation is needed. Project settings follow the Pyright configuration in `pyrightconfig.json` or `pyproject.toml`.
- **Ruby:** Install Solargraph in the project's Ruby environment with `gem install solargraph`. Use `SOLARGRAPH_BINARY` or `RUBY_BINARY` to override executables. Literal `require_relative` paths also work without an analyzer; dynamically constructed paths do not.
- **Rust:** No Rust/Cargo/rustup installation is required. First navigation needs access to GitHub Releases to download the analyzer; afterward it works offline. Supported hosts are macOS/Linux/Windows on x64/arm64; Linux requires glibc. Set `RUST_ANALYZER_BINARY` to use an existing analyzer executable.

Rust navigation covers standalone files, modules and local Cargo dependencies. Definitions that depend on the standard library, external packages, additional features or generated code may not resolve.

Ruby constant aliases follow reassignment order and conditional branches. Reference analysis includes statically evaluable `require`/`require_relative` paths from string variables, concatenation and `File.join`. The same supplementation applies to default and external Solargraph executables.

TS/JS navigation reuses completed results and per-file index summaries, refreshing them when files, drafts or configuration change. Restoring the disk index does not block search. Reference locations and unsaved drafts are not stored in that disk index.

Library definitions outside the workspace cannot be opened. Viewing, highlighting, editing and saving remain available if an analyzer cannot start. Completion, symbol rename/refactoring and code execution are not provided.

### Documents and media

- **Markdown / MDX:** Switch between **Preview / Source**. Relative document links and images stay within the workspace; external images display as links. MDX expressions and components are not executed. Use source for line/range attachments.
- **CSV / TSV:** Toggle **Use first row as headers**, click a column to sort, or use **Filter rows**. Preview covers the first 10,000 rows and 100 columns, 50 rows per page; sorting/filtering applies to that range. Use source for full content and line/range attachments. Invalid CSV quoting falls back to source.
- **Word:** DOCX previews headings, paragraphs, lists, tables and embedded images. Original pagination, fonts and detailed formatting are not reproduced. External images are not read.
- **Excel:** Choose a sheet, then use the table controls. Numbers/dates use stored formats and formulas use stored results without recalculation. Each sheet has the same preview limits as CSV. Cell styles, merged layouts, charts and images are not reproduced. Legacy `.doc`/`.xls` and password entry are unsupported.
- **PDF:** Enter a page or zoom (25–400%), or choose **Fit to width**. Drag text to select/copy. `Cmd/Ctrl+F` searches document text; Enter/Shift+Enter moves between results. Search is limited to 2,048 pages, 4,194,304 characters and 10,000 results. Scanned PDFs require a text layer; OCR and password entry are unsupported.
- **Images / SVG:** Use zoom buttons, a zoom value (1–1600%), pinch or `Ctrl/Cmd+wheel`. Drag or use arrow keys to pan. With image focus, `+`/`-` zoom, `0` restores 100% and Home fits to view. SVG also offers XML source up to 32 MiB; larger files provide preview only.
- **Video / audio:** Use the playback controls. Playback depends on the embedded browser's codec support. Audio starts only when you choose Play and stops when you leave the file.

### Markdown preview and source

![Markdown preview and source](https://raw.githubusercontent.com/bichikim/web/97cc070dac551d6e898a66a0be97af66730ece2c/packages/codex-code-viewer/docs/recordings/codex/0.5.0/markdown.gif)

### Sort a CSV column

![Sort a CSV column](https://raw.githubusercontent.com/bichikim/web/97cc070dac551d6e898a66a0be97af66730ece2c/packages/codex-code-viewer/docs/recordings/codex/0.5.0/csv-sort.gif)

### Filter CSV rows

![Filter CSV rows](https://raw.githubusercontent.com/bichikim/web/97cc070dac551d6e898a66a0be97af66730ece2c/packages/codex-code-viewer/docs/recordings/codex/0.5.0/csv-filter.gif)

## Limits and troubleshooting

| Situation                        | What to check or do                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| No workspace tree                | Enter an absolute file path to connect the workspace.                                                                        |
| A file is missing or cannot open | Check its workspace, path permissions, encoding and size. Protected paths and generated/dependency directories are excluded. |
| Symbols do not navigate          | Check the format and analyzer requirements above. Syntax highlighting alone does not provide navigation.                     |
| Save reports a conflict          | Keep or attach the draft, then discard it to reload the disk version when ready.                                             |
| Changes disappear after restart  | Save before quitting Codex.                                                                                                  |

UTF-8 text files, including code, Markdown and CSV/TSV, can be up to 32 MiB each. Above 512 KiB, files are read-only and use viewport rendering with selection, search and code navigation. Large Markdown and CSV/TSV files display as source. Files containing NUL bytes cannot be opened as text. PDF, DOCX, XLSX, images, video and audio are limited to 128 MiB per file. Paths outside the workspace and `.git`, `.codex`, `.aws`, `.ssh` are excluded. The only hidden files you can open are `.dockerignore`, `.gitignore`, `.gitattributes`, `.gitmodules`, `.editorconfig`, `.prettierignore`, `.eslintignore`, `.npmignore` and `.browserslistrc`. `.env` cannot be opened. Search returns up to 100 results. Search and the tree exclude generated and dependency directories.

Changes made in another program refresh the viewer. Unsaved drafts are not replaced automatically. If the file list does not update, use **Refresh file tree**.

[Development guide](./development.md)

---

## Claude Desktop

**Claude support is experimental.** Limitations in Claude’s plugin and UI integration may affect some features and workflows.

### Install and open in Code mode

```sh
npx @winter-love/codex-code-viewer@latest install --target claude
```

For interactive installation, run the command in [Install and open](#1-install-and-open) and choose **Claude Desktop (Code mode)** or **Both**. For automation, use `install --target claude|all`. Claude-only installation does not need the Codex CLI.

Claude installation currently supports **macOS Apple Silicon**. It requires [Claude Code CLI](https://code.claude.com/docs/en/setup) 2.1.287+ and a Claude Desktop version with Mods support. Only when Claude is selected, the installer downloads the matching GitHub Release runtime, verifies its size and SHA-256, and keeps it in `~/.claude/code-viewer/marketplace` and registers a user-scope plugin through the official CLI. No manual MCP configuration or ZIP upload is required. `CLAUDE_BINARY` and `CLAUDE_CONFIG_DIR` select another executable or configuration directory. For offline installation, `CODE_VIEWER_RUNTIME_ARCHIVE` selects a matching runtime ZIP with the same integrity checks. After replacement succeeds, the previous uploaded plugin is disabled; its files and running sessions are retained.

Add and enable the printed **Code Viewer Attachment.app** path in System Settings → Privacy & Security → Accessibility. This permission enables one-click native composer attachments and expanding a collapsed Browser. If permission errors persist, remove only the existing **Code Viewer Attachment** entry and add the printed application path again: macOS can retain the old ZIP installation path under the same app name. Start a new **local** session in Claude Desktop's **Code** tab, then click **Open Code Viewer** below the composer or a project file link in Claude's response. The viewer opens on demand. Installation does not reload existing sessions.

The open button and built-in integration notices support English, Korean, Japanese, Simplified Chinese and Spanish, following the language selected in Claude Desktop. The default button label is **Open Code Viewer** in English. Unsupported languages, no language selection, or unavailable settings use English. The viewer’s own language is controlled separately in **Settings → Language**.

### Code mode: open in Browser on demand

For manual installation from a local build, the build creates `dist/code-viewer-<version>-claude-code-<platform>-<architecture>.zip`, including Node and analyzers. Users do not install Node or register MCP manually.

1. In Code mode, choose **+ → Add plugins → Add plugin → Upload plugin** and install the ZIP.
2. Start a **local** session with the project folder. Disable **Worktree** to edit the current checkout.
3. Click a project **file link** in Claude's reply or **Open Code Viewer** below the composer. `/code-viewer:open` also works.
4. On macOS, grant the helper Accessibility permission so file links and the open button also reveal a collapsed Browser panel. Other hosts use the top **Browser** button.

A new session does not open a viewer. Mods remembers successful main-conversation `Read`, `Edit` and `Write` locations until the user opens it. An already opened viewer follows in place, preserving per-file unsaved drafts and attachments. Subagents, denials, errors and staged changes are excluded. External links retain their normal behavior; the server also rejects files outside the project.

The screen uses the original HTML and CodeMirror viewer shared with Codex, including the file tree, resizing, search, definitions/references, editing, saving, previews and chat attachments. Mods handles opening requests, location tracking and snapshot delivery. Browser attachments remain available after reading or changing files. For an opened viewer using pending context instead of native cards, Mods reads the retained snapshots with `code.attachments` when the user sends a composer message and adds them to that message’s context. This includes unsaved content that differs from disk. The limited permission handler covers only this Mod-owned read, preserving explicit denials and administrator restrictions. A failed read stops that message with an error instead of silently omitting its attachments. Unopened sessions do not perform this read; snapshots remain until explicitly removed.

On macOS, **Add to chat** in the file tree attaches only the clicked file with its original filename and exact bytes. Other files and pending snapshots are excluded. Code selections attach as `original-filename.selection.txt`, and unsaved diffs as `original-filename.changes.patch`, containing only that selection or patch. The same names apply to already-running older viewers without reloading them. Native card delivery does not accumulate a **Pending context** list. Attaching an older pending list through **Attach to Claude** clears it after card confirmation and retains it on failure. **Copy for Claude attachment** remains a manual Cmd+V alternative.

The local helper requires macOS Accessibility permission and checks the viewer URL, Code session and composer before pasting and confirming a native card. Existing prompt text, attachments and drafts remain unchanged; source files are not saved and messages are not sent. Tree attachment uses disk bytes; editor selection uses unsaved text. Exports use the short path `/tmp/cv-XXXXXX/original-filename` in private temporary directories retained for OS cleanup. For viewers already running before the update, the helper copies only their legacy temporary export to a short path without reloading the viewer. The clipboard is write-only. Desktop engine 2.1.299 displays full paths in composer card titles even through its built-in file picker; original filenames are preserved, but Claude controls that title display. Hosts without native cards retain the pending-context workflow.

Unsaved drafts are stored locally and restored when reopening or reloading the same viewer session. Saved or discarded drafts are not restored. Following and repeated opening reuse the page. The previous [native Pane implementation](claude/code/hooks/README.md) and its stored session data are retained but are not registered by the default entrypoint. Previous Pane drafts are not automatically migrated into Browser. The viewer also restores the 64 most recent files’ selections, scrolling and preview settings per workspace when reopening the same session. Clearing browser storage or opening a different session prevents recovery. The `.mcpb` remains the inline viewer for regular Chat conversations.

### Local extension for regular Chat

Build this package with `pnpm --filter @winter-love/codex-code-viewer build`. The build also produces `dist/code-viewer-<version>-<platform>-<arch>.mcpb` for the build machine, including its native analyzer and runtime assets. It requires a Node.js 24+ runtime. Install it through Claude Desktop **Settings → Extensions → Advanced settings → Install Extension…** and select the workspace folder. These are [local desktop extensions](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop), using [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview).

Ask Claude to open a file with `code.open`, or open the configured folder with `code.panel`. The viewer appears as an MCP App inside the conversation; Codex's right-panel and file-menu entrypoints are specific to Codex. Reads, navigation, editing and file operations stay inside the selected folder, even when it is a subfolder of a larger repository. The Claude server does not read Codex's conversation database.

The [public MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx#display-modes) defines `inline`, `fullscreen`, and `pip` display modes, without a fixed right-panel registration API. [Claude's fullscreen view](https://support.claude.com/en/articles/13454812-use-interactive-connectors-in-claude) keeps the conversation input available, but this viewer does not yet implement display-mode switching. The Claude Desktop Code tab's [built-in file pane](https://code.claude.com/docs/en/desktop#open-and-edit-files) is a separate feature.

Selected editor text and unsaved diffs are attached as snapshots. File attachments include a bounded text snapshot; folder attachments include a shallow listing. `code.context` lets Claude read additional text ranges. Context reads are limited to 200 lines or directory entries and 64 KiB; binary media can be previewed but is not attached as text. The attachment list supports removal and clearing, with a total limit of 20 attachments and 64 KiB. Adding context does not send a message or save a file. Snapshots are retained in the viewer session for Claude to retrieve through `code.attachments`. The standard context API is also updated, but an acknowledged update did not reach the next model turn in the installed Claude environment. Allow attachment tool retrieval when asking about selections. Closing the session removes its snapshots. Standard hosts do not report Codex's attachment consumption state: clear attachments explicitly when they are no longer needed. Reloading the app loses its local attachment list and unsaved drafts.

For Code mode, use the installation command above. Developers who need the ordinary Chat server can configure the built server directly with an external Node.js 24+ installation:

```json
{
  "mcpServers": {
    "code-viewer": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/dist/claude.js", "/absolute/workspace/folder"]
    }
  }
}
```
