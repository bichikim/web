# Code Viewer user guide

[한국어 사용 설명서](./README.ko.md)

Code Viewer opens code, documents and media beside your Codex conversation. Use it to find related code, edit text files and attach selected code or changes to your next message.

See [Supported formats](#supported-formats) for the features available for each file type.

## 1. Install and open

You need Node.js 24 or later, npm, the Codex desktop app and a Codex CLI that supports the `plugin` subcommand. If the CLI is missing or needs updating:

```sh
npm install -g @openai/codex
```

Install Code Viewer:

```sh
npx @winter-love/codex-code-viewer@latest install
```

Fully quit and reopen Codex. In a project conversation, open the right panel's new-tab menu and select **Code Viewer**. The default file viewer's **Open** menu launches external applications.

The viewer connects to the conversation's workspace when its path is available. Otherwise, enter a file's absolute path, such as `/Users/yourname/projects/my-project/src/main.tsx`, and press Enter.

To update, run the same installation command and reopen Codex. Check the installation with:

```sh
codex plugin list --json --marketplace winter-love-code-viewer-npm
```

Set `CODEX_HOME` if you use another Codex configuration directory. If the CLI is not on `PATH`, set `CODEX_BINARY` to its executable path.

## 2. Open and find files

- **Open a path:** Enter an absolute path, or a relative path within the connected workspace, and press Enter or **Open file**. To jump to a position, use `src/main.tsx:20:5`.
- **Search by name:** Press `Cmd/Ctrl+P` and enter a filename or part of its path. Select a result with Up/Down and Enter, or click it. Escape closes results.
- **Browse folders:** Use **File tree** beside search. Click a folder to expand it or a file to open it. **Filter files** narrows the tree by path; **Reveal current file** clears the filter and scrolls to the open file.
- **Return to a file:** Use the back/forward buttons or `Alt+←/→`.

Drag the divider to resize the tree. With the divider focused, Left/Right changes its width and Home/End selects minimum/maximum width. With tree focus, Up/Down and Home/End select entries; Left/Right collapses/expands folders. Right-click or `Shift+F10` opens an entry's menu.

Reopening a file in the same tab restores its selection, scrolling and applicable preview, zoom or page settings. An explicit line/column destination takes priority. The viewer remembers the 64 most recent files per workspace; closing or reloading clears this state.

## 3. Read and navigate code

In reading mode, click an import path to open its module, or a symbol usage to open its definition. Click a definition name to list its usages. Results are grouped by file; select a result to navigate. If there are multiple definitions, choose one from the list.

Definition and usage navigation supports TypeScript, JavaScript, Python, Ruby and Rust. JSON/JSONC/JSON5 supports file-path navigation only. Other highlighted formats do not provide symbol navigation. Language requirements are listed under [Navigation setup](#navigation-setup).

While editing or reading an unsaved draft as source, a normal click places the cursor. Use `Cmd/Ctrl+click` or `F12` for navigation in these views; use arrow keys and Enter in a result list and Escape to close it.

Press `Cmd/Ctrl+F` to find literal text without case sensitivity. Enter/Shift+Enter moves between matches; Escape closes search. Markdown and CSV/TSV switch to source mode for this search. PDF uses its own document search.

## 4. Edit and save text

1. Open an editable file and choose **Edit** in the document toolbar.
2. Make changes. Use `Cmd/Ctrl+Z` to undo and `Cmd/Ctrl+Shift+Z` to redo.
3. Choose **Save** or press `Cmd/Ctrl+S`. There is no autosave or automatic formatting.

See [Supported formats](#supported-formats) for editable file types. Markdown and CSV/TSV are edited as source.

You can move between files without losing drafts. Toggle **Edit** off to read unsaved content without editing it. For Markdown and CSV/TSV, turn **Edit** off to access **Preview / Source**; previews include unsaved content. To discard a draft, turn **Edit** on and choose **⋯ → Discard changes**.

TS/JS and JSON navigation includes unsaved changes from multiple files. Python, Ruby and Rust include changes from the current file only; save changes to other files before navigating to them.

If another program changes the original, saving is rejected and your draft remains. Attach its changes to chat for review, or discard it to reload the original. If the file was deleted externally, **Save** recreates it at the same path; **Discard changes** closes it. If another program restores the file first, saving reports a conflict.

When you change workspace or Codex requests viewer closure, choose save-all, discard or continue editing. Save drafts before closing or reloading. Unsaved content cannot be recovered after a forced shutdown.

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

Right-click a file or folder for **Rename**, **Copy**, **Cut**, **Paste** or **Delete**. With tree focus, `Cmd/Ctrl+C`, `Cmd/Ctrl+X`, `Cmd/Ctrl+V` and Delete are also available. Copy/cut uses an internal clipboard within this viewer's workspace. Paste on a folder places entries inside it; paste on a file uses its parent. The empty-space menu pastes at the workspace root. Copy collisions create a copy name; cut/rename collisions report an error.

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

- **TypeScript / JavaScript:** Uses the nearest tsconfig, including `paths`, relative imports and barrel exports. Bundler-only aliases, browser public URLs and computed paths may not resolve.
- **Python:** No separate analyzer installation is needed. Project settings follow the Pyright configuration in `pyrightconfig.json` or `pyproject.toml`.
- **Ruby:** Install Solargraph in the project's Ruby environment with `gem install solargraph`. Use `SOLARGRAPH_BINARY` or `RUBY_BINARY` to override executables. Literal `require_relative` paths also work without an analyzer; dynamically constructed paths do not.
- **Rust:** No Rust/Cargo/rustup installation is required. First navigation needs access to GitHub Releases to download the analyzer; afterward it works offline. Supported hosts are macOS/Linux/Windows on x64/arm64; Linux requires glibc. Set `RUST_ANALYZER_BINARY` to use an existing analyzer executable.

Rust navigation covers standalone files, modules and local Cargo dependencies. Definitions that depend on the standard library, external packages, additional features or generated code may not resolve.

Library definitions outside the workspace cannot be opened. Viewing, highlighting, editing and saving remain available if an analyzer cannot start. Completion, symbol rename/refactoring and code execution are not provided.

### Documents and media

- **Markdown / MDX:** Switch between **Preview / Source**. Relative document links and images stay within the workspace; external images display as links. MDX expressions and components are not executed. Use source for line/range attachments.
- **CSV / TSV:** Toggle **Use first row as headers**, click a column to sort, or use **Filter rows**. Preview covers the first 10,000 rows and 100 columns, 50 rows per page; sorting/filtering applies to that range. Use source for full content and line/range attachments. Invalid CSV quoting falls back to source.
- **Word:** DOCX previews headings, paragraphs, lists, tables and embedded images. Original pagination, fonts and detailed formatting are not reproduced. External images are not read.
- **Excel:** Choose a sheet, then use the table controls. Numbers/dates use stored formats and formulas use stored results without recalculation. Each sheet has the same preview limits as CSV. Cell styles, merged layouts, charts and images are not reproduced. Legacy `.doc`/`.xls` and password entry are unsupported.
- **PDF:** Enter a page or zoom (25–400%), or choose **Fit to width**. Drag text to select/copy. `Cmd/Ctrl+F` searches document text; Enter/Shift+Enter moves between results. Search is limited to 2,048 pages, 4,194,304 characters and 10,000 results. Scanned PDFs require a text layer; OCR and password entry are unsupported.
- **Images / SVG:** Use zoom buttons, a zoom value (1–1600%), pinch or `Ctrl/Cmd+wheel`. Drag or use arrow keys to pan. With image focus, `+`/`-` zoom, `0` restores 100% and Home fits to view. SVG also offers XML source; above 512 KiB, only preview is available.
- **Video / audio:** Use the playback controls. Playback depends on the embedded browser's codec support. Audio starts only when you choose Play and stops when you leave the file.

## Limits and troubleshooting

| Situation                        | What to check or do                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| No workspace tree                | Enter an absolute file path to connect the workspace.                                                                        |
| A file is missing or cannot open | Check its workspace, path permissions, encoding and size. Protected paths and generated/dependency directories are excluded. |
| Symbols do not navigate          | Check the format and analyzer requirements above. Syntax highlighting alone does not provide navigation.                     |
| Save reports a conflict          | Keep or attach the draft, then discard it to reload the disk version when ready.                                             |
| Changes disappear after restart  | Drafts cannot be recovered after closing. Save before you close.                                                             |

Text files, including code, Markdown and CSV/TSV, must be UTF-8 and at most 512 KiB each. Files containing NUL bytes cannot be opened as text. PDF, DOCX, XLSX, images, video and audio are limited to 128 MiB per file. Paths outside the workspace and `.git`, `.codex`, `.aws`, `.ssh` are excluded. The only hidden files you can open are `.dockerignore`, `.gitignore`, `.gitattributes`, `.gitmodules`, `.editorconfig`, `.prettierignore`, `.eslintignore`, `.npmignore` and `.browserslistrc`. `.env` cannot be opened. Search returns up to 100 results. Search and the tree exclude generated and dependency directories.

Changes made in another program refresh the viewer. Unsaved drafts are not replaced automatically. If the file list does not update, use **Refresh file tree**.

[Development guide](./development.md)
