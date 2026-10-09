# Code Viewer

[한국어 README](https://github.com/bichikim/web/blob/dev/packages/codex-code-viewer/README.ko.md)

A plugin for reading and navigating code beside your Codex conversation. The current development source also supports editing TypeScript, JavaScript, stylesheets, component and configuration files, and plain text. Follow imports and symbols to related code, then add a file or an exact line and column range as context for your next chat message.

## Features (0.4.0)

| Feature                 | How to use it                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read code               | View TypeScript, JavaScript, Rust, HTML and configuration files with line numbers and syntax highlighting.                                         |
| Navigate related code   | Click an import to open its module, or a symbol to jump to its definition.                                                                         |
| Find files              | Expand folders in the file tree or search by path or filename. `Cmd/Ctrl+P` focuses search.                                                        |
| Search the current file | Use `Cmd/Ctrl+F` to find text and move between matches.                                                                                            |
| Add code to chat        | Select line numbers or drag across text, then choose **Add to chat** from the context menu. The file path and exact range accompany the selection. |
| History and themes      | Navigate back and forward through visited files, using the light/dark theme and fonts provided by Codex.                                           |
| Read documents          | Preview Markdown and MDX, sort and filter CSV/TSV tables, or read plain text.                                                                      |
| Read PDFs               | Navigate pages, zoom, fit to width, select and copy text, and search the document.                                                                 |
| Word                    | Preview headings, paragraphs, lists, tables and embedded images in `.docx` files.                                                                  |
| Excel                   | Select sheets in `.xlsx` files and inspect cells, sort columns, filter rows and navigate pages.                                                    |
| View media              | Zoom and pan images and SVGs, or play video and audio.                                                                                             |
| Restore view state      | Reopening a file in the same viewer tab restores its selection, scrolling, preview mode, zoom and PDF page.                                        |

Supported TS/JS extensions are `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs` and `.cjs`. The current development source can edit and save these files along with Ruby, Python, Rust, CSS/SCSS/SASS/LESS, Vue/Svelte/Astro, XML/INI/CONF/CFG/PROPERTIES, JSON variants, TOML, YAML/YML, HTML/HTM and plain text. Ruby includes `.rb`, `.rake`, `.gemspec`, `Gemfile` and `Rakefile`; Python includes `.py` and `.pyi`; Rust uses `.rs`. The [shared editing rules](https://github.com/bichikim/web/blob/dev/packages/codex-code-viewer/src/shared/is-editable-file.ts) define editable files. Markdown and CSV/TSV are edited as source text.

For example, follow a component's import to its implementation, select a function and choose **Add to chat**, then ask Codex to explain or modify it. See [Supported formats](#supported-formats) for format-specific features and required tools.

## Code editing (current development source)

Choose **Edit** in the document toolbar to open the editor with line numbers and syntax highlighting. Undo with `Cmd/Ctrl+Z` and redo with `Cmd/Ctrl+Shift+Z`. Choose **Save** or press `Cmd/Ctrl+S` to save the current file. There is no autosave. Reading and editing both highlight TS/JS, Ruby, Python, Rust, CSS/SCSS/SASS/LESS, Vue/Svelte/Astro, XML/INI/CONF/CFG/PROPERTIES, JSON/JSONC/JSON5, TOML, YAML/YML and HTML/HTM. Other text formats use plain-text editing. HTML, Vue, Svelte and Astro are edited as source and never executed. `.conf` and `.cfg` use INI-style highlighting for sections, keys, values and comments.

In the editor, a normal click places the cursor. Use `Cmd/Ctrl+click` or `F12` on a definition name to open its usages. Select a result with the arrow keys and Enter, or close the list with Escape. On TS/JS imports and symbols, Ruby/Python/Rust symbols, Ruby require paths, and relative or absolute file path values in JSON/JSONC/JSON5, the same gesture opens the corresponding file or definition. Navigable text is underlined on hover.

TS/JS and JSON navigation uses unsaved drafts. Ruby, Python and Rust send the current file's draft to their analyzer; they do not analyze unsaved drafts from other files together. Required analyzers and environments are listed under [Supported formats](#supported-formats). Editing, highlighting and saving remain available without an analyzer. JSON navigation follows file path values only; ordinary strings and property keys do not have definitions.

Drafts remain available when you navigate to another file in the workspace. Toggle **Edit** off to read the content without editing, including any unsaved draft. Markdown and CSV/TSV share **Preview / Source** controls in the same toolbar, and previews reflect unsaved content. Choose **Discard changes** from the **⋯** menu while editing.

**⋯ → Add changes to chat** attaches a diff of the current file's unsaved changes to the next chat message. It compares against the last content read or saved and includes the file path and original revision. It captures the content when you choose the action; later edits require another attachment. Saving and sending the message are separate actions. If the diff exceeds calculation limits, the viewer reports an error instead of silently omitting content.

If another program changes the original file, saving is rejected and your draft is retained. Use **Add changes to chat** to review it, or **Discard changes** to reload the original. Switching the workspace connection or receiving a host close request offers save-all, discard or continue-editing choices. Reloading or closing the browser also requests an unsaved-change warning. Drafts are held in memory and cannot be recovered after a forced shutdown.

The editor's context menu attaches the selected range including unsaved content. File-tree attachments refer to the file on disk. Code execution, completion and symbol rename/refactoring are outside this scope.

Saving supports editable UTF-8 files. If an open file is deleted externally, the viewer retains its content and treats deletion itself as an unsaved change. Save stays available even without edits and recreates the file at the same path. If another program restores it first, the viewer reports a conflict instead of overwriting it. **Discard changes** closes a deleted document and removes its draft while keeping the workspace and tree open.

Saving applies the [workspace and file restrictions](https://github.com/bichikim/web/blob/dev/packages/codex-code-viewer/src/server/file-access.ts) and [save checks](https://github.com/bichikim/web/blob/dev/packages/codex-code-viewer/src/server/write-source.ts), using a temporary file in the same directory before replacement. JSON can be saved with incomplete syntax; no automatic formatting is applied. Drafts sent for analysis follow the [count and size limits](https://github.com/bichikim/web/blob/dev/packages/codex-code-viewer/src/shared/editing-limits.ts).

## Installation (0.4.0)

You need [Node.js](https://nodejs.org/en/download) 24 or later, npm, a current Codex desktop app and the [Codex CLI](https://developers.openai.com/codex/cli). If `codex` is missing or does not support the `plugin` subcommand, install or update the CLI first:

```sh
npm install -g @openai/codex
```

Then run:

```sh
npx @winter-love/codex-code-viewer@0.4.0 install
```

npm downloads the installer, which creates and registers an npm plugin catalog inside your personal Codex configuration directory and installs the plugin. No ZIP download, manual extraction, repository build or separate preview server is required. Installing the public package does not require an npm login. The default configuration directory is `~/.codex`; set `CODEX_HOME` to use another directory. If the CLI is not on `PATH`, set `CODEX_BINARY` to its executable path.

Fully quit and reopen Codex after installation. In a project conversation, select **Code Viewer** from the new-tab menu in the right panel, enter the first file's **absolute path**, and press Enter. For example: `/Users/yourname/projects/my-project/src/main.tsx`.

Follow imports or symbols to navigate. Select code and choose **Add to chat** from the context menu to add the file and range to the next message. The default file viewer's **Open** menu launches external applications.

Check installation with `codex plugin list --json --marketplace winter-love-code-viewer-npm`.

The installer uses a local catalog and npm source described in the [official plugin marketplace documentation](https://developers.openai.com/plugins/build/plugins#marketplace-metadata). Listing in OpenAI's official catalog is a separate process.

### Updating

To install the latest public version, run this command, then fully quit and reopen Codex:

```sh
npx @winter-love/codex-code-viewer@latest install
```

After a successful installation, the installer removes previous Code Viewer copies installed through GitHub or development catalogs to avoid duplicate tabs. Other plugins and marketplace registrations are retained.

<details>
<summary>Reference: installing version 0.1.0</summary>

If you need 0.1.0, register the GitHub marketplace catalog and install from it. `bichikim/web` identifies the catalog repository; do not replace it with your username.

```sh
codex plugin marketplace add bichikim/web --ref '@winter-love/codex-code-viewer@0.1.0' --sparse .agents/plugins --json
codex plugin add codex-code-viewer@winter-love-plugins --json
```

</details>

## Usage

- **Opening files:** A file entry point uses the path supplied by the Codex host. The same input accepts paths and search terms. Enter an absolute or relative supported path and press Enter or **Open file**. It also recognizes `path:line:column` addresses and paths inside sentences. The first file requires an absolute path; opening another absolute path starts a new workspace and navigation history.
- **Imports:** Click an import string to open its module. Relative paths, barrel `index.ts` files and tsconfig `paths` are resolved.
- **Symbols and usages:** Click a usage to open its definition, or a definition name to list usages inside the workspace. TS/JS, Python, Ruby and Rust use their existing analyzers. Results are grouped by file with its path and usage count shown once; each item displays line, column and a one-line code preview. Groups stay expanded and long lists scroll as a whole. Previews prefer unsaved drafts; an unreadable preview does not remove a destination. Select an item to navigate. Empty usages show an empty result, while multiple definitions show a definition picker.
- **History:** Back and forward navigate to visited files and lines. Unavailable directions are disabled. Failed navigation does not change history. `Alt+←/→` also navigates back and forward.
- **Renaming:** Choose **Rename** in a file or folder's context menu to change its name in the same directory without overwriting an existing entry. Open documents and history paths update together. Save or discard drafts before renaming their files or a containing folder.
- **File tree:** The **File tree** button beside search toggles the right panel. Ancestors of the current file expand automatically and the file is highlighted. Click a folder to expand/collapse or a file to open it. **Filter files** matches part of a path while preserving hierarchy. Use Up/Down, `Home` and `End` to select, and Left/Right to collapse/expand folders. Right-click or `Shift+F10` opens copy, cut, paste, chat attachment, path copy and deletion actions. **Copy path** copies the absolute path. **Add to chat** attaches a whole file/folder path without line numbers, including unsupported formats. Opening a menu does not navigate or toggle folders. The tree displays up to 10,000 files and folders, excluding hidden paths, generated files and symlinks; unsupported files cannot be opened.
- **File search:** Enter a filename or query without a path to search supported workspace files. Click a result or select it with Up/Down and Enter. `Cmd/Ctrl+P` focuses the input and Escape closes results.
- **Reveal and creation:** **Reveal current file** above the filter clears it, expands ancestors and scrolls to the open file. **New file** and **New folder** create siblings of the selected file, children of a selected folder, or entries at an empty workspace's root. The name dialog shows the destination. Existing entries are never overwritten. The tree shows the new entry and supported files open immediately. Empty folders are included. Names cannot contain path separators, colons, or hidden/generated names excluded by the tree.
- **Copy, cut and paste:** The tree context menu manages actual disk entries. With tree focus, `Cmd/Ctrl+C`, `X`, `V` and `Delete` are also available. Copy/cut uses an internal clipboard limited to this viewer's workspace; it differs from **Copy path**. Paste into a folder creates a child; paste on a file uses its parent. The empty-space context menu supports pasting at the workspace root. Copy collisions generate a copy name; cut collisions report an error without overwriting. Cut removes the source only after the complete copy succeeds and its original snapshot is rechecked.
- **Deletion:** A confirmation dialog identifies the target. Deletion is **permanent and bypasses the trash**. Entries with unsaved drafts or saves in progress cannot be changed. If the source changes after inspection, the action stops; repeat the copy/cut/delete request. The workspace itself, symlinks and folders containing `.git`, `.codex`, `.aws` or `.ssh` are protected. Inspection is limited to 10,000 entries per operation.
- **Tree width:** Drag the divider between document and tree. Default tree width is 288px, with minimum widths of 200px for the tree and 240px for the viewer. Focus the divider and use Left/Right for 16px steps or `Home`/`End` for minimum/maximum width. Width and filter remain when the panel reopens in the same tab. Narrow windows allow horizontal scrolling.
- **Find in file:** `Cmd/Ctrl+F` searches literal text without case sensitivity and highlights matches above the code. Enter/Shift+Enter or previous/next buttons cycle results; Escape closes search. A single-line text selection supplies the initial query. Search navigation retains the line selection used for chat context.
- **Code context menu:** Right-click code or press `Shift+F10` on a line number for **Copy code**, **Add to chat** and **Find in file**. Right-clicking selected text preserves its range; right-clicking a token uses its exact range. A line number or blank area within a line selects that line even inside a previous range; space outside lines preserves selection. The range is captured when the menu opens, so menu focus cannot alter the attachment. Copy excludes line numbers. Use Up/Down, `Home`, `End` and Escape to navigate or close.
- **Line selection:** Click a line number, drag across numbers or Shift-click another number to select a range. Highlight and code address update together. Focused line numbers support Up/Down, `Home`, `End` and Shift to extend the range. Selection requires no new file request or history entry.
- **Text selection:** Drag code text to select exact start/end lines and columns. Columns use UTF-16 and the end is exclusive: `5:3-5:7` selects columns 3–6 on line 5. Native selection/copying are preserved while the address and highlights update. A selection drag does not trigger import or symbol navigation.
- **Chat context:** Attach the selected file, lines or exact text range to the next message. Repeated attachments accumulate in order in one Code Viewer context, including ranges from different files. The list clears when the host reports consuming or removing it. The viewer does not type into the composer or send messages automatically.
- **Feedback:** Rounded toasts show errors and completion messages and close after five seconds. New notifications restart their lifetime even for identical text. Hover or keyboard focus pauses dismissal; the close button or Escape dismisses. The footer shows the selected address and workspace name, with the full path on hover. Selection and navigation remain available while a toast is visible.
- **External changes:** File-change events and returning focus refresh the current file. Navigation requests based on old content are rejected.
- **Host appearance:** The viewer uses the host's light/dark theme, background/text/border colors and fonts, including theme-change events. Missing colors use light/dark defaults. Syntax highlighting has its own palette because standard host context does not provide a full syntax palette.
- **Controls:** Rounding, shadows, UI font sizes and weights follow host design values. Defaults use 12px controls, 16px input areas, a 20px search area and light shadows. Toolbars use line icons and rounded hover areas. Inputs lightly emphasize background/border on hover without an extra focus ring or border. Button hover/pressed styles apply only when enabled. Transitions take 150ms and are disabled for reduced-motion preferences.

### Supported formats

| Format              | Extensions                                                                  | Display and interaction                                                         |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Code                | `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs`                | Syntax highlighting and definition navigation                                   |
| Rust                | `.rs`                                                                       | Highlighting, definition/module navigation, selection, search and chat context  |
| Python              | `.py`, `.pyi`                                                               | Highlighting, import/definition navigation, selection, search and chat context  |
| Ruby                | `.rb`, `.rake`, `.gemspec`, `Gemfile`, `Rakefile`                           | Highlighting, require/definition navigation, selection, search and chat context |
| Configuration       | `.yaml`, `.yml`, `.toml`, `.json`, `.jsonc`, `.json5`, `Cargo.lock`         | Format-specific highlighting, selection, search and chat context                |
| Markdown            | `.md`, `.markdown`, `.mdx`                                                  | Preview/source modes, tables, task lists, relative document links and images    |
| PDF                 | `.pdf`                                                                      | Page navigation, zoom, fit to width, text selection/copy and document search    |
| HTML                | `.html`, `.htm`                                                             | Source with tag, attribute, value, comment and embedded JavaScript highlighting |
| CSV / TSV           | `.csv`, `.tsv`                                                              | Table/source modes, column sorting, row filtering and pagination                |
| SVG                 | `.svg`                                                                      | Image preview/XML source modes, highlighting and search                         |
| Stylesheets         | `.css`, `.scss`, `.sass`, `.less`                                           | Reading/editing highlighting and saving                                         |
| Components          | `.vue`, `.svelte`, `.astro`                                                 | Markup, embedded script/style highlighting, editing and saving                  |
| XML / configuration | `.xml`, `.ini`, `.conf`, `.cfg`, `.properties`                              | Reading/editing highlighting and saving                                         |
| Plain text          | Extensionless files and UTF-8 text such as `.dockerignore` and `.gitignore` | Source, line numbers, range selection, copy and search                          |
| Images              | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.bmp`, `.ico`           | Fit to view, zoom input, pinch zoom and panning                                 |
| Video               | `.mp4`, `.m4v`, `.webm`, `.mov`, `.ogv`                                     | Native playback, volume and seek controls                                       |
| Audio               | `.mp3`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.oga`, `.opus`, `.flac`, `.weba`   | Native play/pause, volume and seek controls                                     |

Rust, Python, Ruby, JSON variants, TOML and YAML use Prism highlighting in reading mode. Rust functions, types, variables, `use` aliases and `mod` names navigate through `rust-analyzer`. Stylesheets, components, XML, INI and PROPERTIES share CodeMirror language parsers between reading and editing. Configuration and component files do not provide symbol definition navigation. JSON/JSONC/JSON5 path values navigate to files inside the workspace. Only `Cargo.lock` is treated as TOML; other `.lock` files use plain text.

Open general UTF-8 text through search, the tree or path input. HTML displays source and line numbers without executing tags or scripts. The Codex file entry point registers known extensions; use the tree or path input for extensionless or arbitrary extensions.

#### Python

Python navigation uses the bundled [Pyright language server](https://github.com/microsoft/pyright). Click module names in `import`/`from`, imported aliases, functions, classes, methods or variables to reach analyzed definitions. Relative imports, package re-exports and `.pyi` stubs are supported. The analyzer uses Pyright configuration and search paths from the workspace's `pyrightconfig.json` or `pyproject.toml`. No separate Pyright installation is needed.

First navigation starts a local Node analyzer process reused for the workspace. It may invoke the environment's Python interpreter to discover its version/search paths; navigation does not execute Python project code. Open-file changes are sent to the analyzer. A host close notification, session closure or server shutdown disposes it. Standard-library and external-package definitions outside the workspace are excluded. Highlighting, selection and search remain available if it cannot start.

#### Ruby

Ruby definition navigation uses the [Solargraph language server](https://solargraph.org/guides/language-server). Install it once in the project's Ruby environment on the server host:

```sh
gem install solargraph
```

Require paths, modules, classes, methods and instance variables navigate to analyzed definitions. Literal `require_relative` resolves from the current file without an analyzer; dynamically constructed require paths do not receive links. The first definition lookup starts the analyzer and reuses it within the same Gemfile project. `Gemfile`/`gems.rb` distinguish nested projects; `.solargraph.yml` supplies configuration. Override the executable with `SOLARGRAPH_BINARY` or interpreter with `RUBY_BINARY`. By default the current Ruby environment's Solargraph gem is used, so its gem executable need not be on `PATH`.

Open-file changes are synchronized and analyzer character positions are converted to UTF-16 coordinates. Shutdown cleans up the analyzer and its Unix child processes. Gem and standard-library definitions outside the workspace are excluded. Opening, highlighting, selecting and searching remain available if it cannot run.

#### Rust

Rust navigation uses the bundled `rust-analyzer`. Beyond Node 24 or later, no Rust, Cargo or rustup installation is required, and first navigation does not download anything. Builds include pinned, SHA-256-verified analyzers for macOS, Linux and Windows on x64 and arm64. Linux binaries target glibc environments. Set `RUST_ANALYZER_BINARY` to use a specific analyzer path.

The viewer reads library/binary source paths, workspace members, local `path` dependencies and aliases, inherited workspace dependencies/editions and default features from `Cargo.toml`, then supplies the [official project structure format](https://rust-analyzer.github.io/book/non_cargo_based_projects.html). Standalone `.rs` files and files connected with `mod` are also analyzed. The analyzer is reused within a project and reconnected when local package structure changes. Its file watcher handles module-file changes.

This minimal setup navigates functions, types, variables, methods and modules inside the workspace. It does not bundle or download standard-library source or crates.io/Git dependencies, limiting inference and navigation through those types. Platform-specific and dev dependencies, feature propagation between dependencies, non-default feature selection, Cargo patch/replace, build-script-generated code, procedural macros and compile-on-save checks are not provided. Viewing, highlighting, editing and saving remain available independently of these limits.

#### Markdown and tables

`Cmd/Ctrl+F` in Markdown switches to source for searching. Use source to select line/column ranges for chat. MDX imports, JSX and expressions display statically without execution; invalid MDX falls back to ordinary Markdown. Source is always available. HTML is text. Relative document links open files in the workspace, and relative images follow the same restrictions. External image URLs appear as links rather than downloaded images.

CSV/TSV tables use the first row as column names by default; disable **Use first row as headers** for headerless files. Click a column name to sort ascending/descending or use **Filter rows** to match cells. Quoted cells containing commas, tabs or newlines, escaped double quotes, UTF-8 BOMs and empty cells are supported. HTML and formulas remain text. Parsing is local using the bundled [csv-parse browser distribution](https://csv.js.org/parse/distributions/).

Tables display 50 rows at a time and preview only the first 10,000 rows, including headers, and 100 columns. A notice identifies truncation; **Source** exposes the full text. Sorting/filtering applies to the preview range. Multiline cells can make table row numbers differ from text line numbers, so range selection and chat attachment use source; `Cmd/Ctrl+F` also switches to source. UTF-8 CSV/TSV files have the same 512 KiB limit as other text. Invalid quoting shows a notice and falls back to source.

#### Word and Excel

DOCX is converted locally with [Mammoth](https://github.com/mwilliamson/mammoth.js) to display headings, paragraphs, lists, tables and embedded images. Original pagination, fonts and detailed formatting are not reproduced. Expand conversion notices to inspect them. Executable tags, event attributes and style attributes are excluded; links allow only HTTP(S), email and document footnotes. External images are not read.

XLSX is parsed locally with [SheetJS](https://docs.sheetjs.com/docs/). Select a sheet to inspect cells with the same table controls as CSV/TSV. The first row is data by default. Numbers/dates use stored display formats; formulas show stored results without recalculation. Each sheet previews up to 10,000 rows and 100 columns, with 50 rows per page. Cell styling, merged layouts, charts, images, editing and password entry are not provided. Legacy `.doc` and `.xls` are unsupported.

#### SVG, PDF and media

SVG supports image preview and XML source modes. Source uses HTML-style markup highlighting, `Cmd/Ctrl+F` and exact range attachments from its context menu. Preview supports zoom and pan. SVGs above 512 KiB offer preview only within the image limit, with source disabled. Attach a whole SVG through the tree context menu or a source range through its code context menu.

Attach PDF, DOCX, XLSX, image, video and audio files through **Add to chat** in the tree context menu. This attaches the whole path without line numbers. Media is read in 256 KiB chunks through session-bound MCP tools and displayed as Blobs, released on file changes or viewer closure. Files come from the connected server host; no separate media server is required. Video/audio playback also depends on embedded browser codec support. Display errors are reported.

PDF parsing uses a bundled PDF.js worker and renders only the current page. Fonts, CMaps and decoders are bundled; files are not sent to an external PDF service. Enter a page number or zoom (25–400%) and press Enter or leave the field to apply it. **Fit to width** follows the viewer width. Switching files terminates parsing; page/zoom changes cancel previous rendering.

Drag PDF text to select it and copy with `Cmd/Ctrl+C`. The search button or `Cmd/Ctrl+F` searches the whole document, using selected text as the initial query. Matches are highlighted and the current result scrolls into view. Enter/Shift+Enter and previous/next controls navigate to the result's page; Escape closes search. Search is case-insensitive and can match across line breaks. Extracted text is reused, with limits of 2,048 pages, 4,194,304 characters and 10,000 results; reaching a limit shows a notice. Scanned PDFs without text cannot be searched. OCR and password entry are not provided.

Images accept zoom from 1–1600%, applied on Enter or blur. Use zoom buttons, pinch gestures, or Ctrl/Cmd+wheel; trackpad pinch and modified wheel zoom around the cursor ([wheel events](https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event)). Larger images can be panned within their bounds by dragging, wheel or arrow keys. **Fit to view** follows the window without enlarging past native size. With image focus, `+`/`-` zoom, `0` resets to 100%, and `Home` fits to view.

Audio never autoplays. Choose Play to start; switching files or closing the viewer stops playback. The player uses [HTML audio controls](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/audio#controls).

### Workspace connection and limits

Opening from the tools menu connects the conversation's workspace and shows its tree before file selection. The conversation ID supplied by Codex reads only the working-directory field in local metadata, not the conversation body. If no path is found, the viewer asks for an absolute file path. New conversations whose metadata has not yet been saved show the same prompt.

Opening a file directly determines the workspace from an ancestor containing `.git` or `pnpm-workspace.yaml`. Rust projects without these markers use an ancestor `Cargo.toml`. Reading does not execute or modify files. Text is limited to 512 KiB per file; PDF, DOCX, XLSX, images, video and audio to 128 MiB. Paths outside the workspace and `.git`, `.codex`, `.aws` and `.ssh` are excluded. Only hidden configuration files in [`HIDDEN_TEXT_FILES`](https://github.com/bichikim/web/blob/dev/packages/codex-code-viewer/src/shared/file-formats.ts) are allowed; others such as `.env` are excluded. Non-UTF-8 content and files with NUL bytes cannot open as text. Search excludes generated files and `node_modules`, inspecting up to 10,000 files and returning up to 100 results.

### Per-file view state (current development source)

Reopening from the tree, search or history restores code/text horizontal and vertical scrolling and line/column selection; Markdown preview/source mode and scrolling; PDF page/zoom/fit mode; and image/SVG zoom and pan. An explicit line/column address or definition destination takes priority. Selections and PDF pages are clamped if content becomes shorter.

View state is held in memory for the 64 most recent files per workspace while the viewer remains open. Closing or reloading resets it; nothing is written to disk.

### Navigation caches (current development source)

Search and the tree share a file index per workspace. File-watcher events refresh added, renamed or deleted entries and open document content. Filters, expanded folders and scroll positions are retained; document replacement waits while an unsaved draft exists. A loopback event stream with a random token per session carries change signals instead of periodic scans. No external network connection or additional installation is required. When watching is unavailable, manual refresh and directory-change validation during reads remain available.

Recent documents reuse source and tokens within [document cache limits](https://github.com/bichikim/web/blob/dev/packages/codex-code-viewer/src/server/create-document-reader.ts). Reads validate the path and nanosecond change metadata; changed or missing files cannot use stale entries. Closing a session releases watchers and the document cache.

PDF, DOCX, XLSX, images, video and audio reuse received Blobs within the [media cache's count and byte limits](https://github.com/bichikim/web/blob/dev/packages/codex-code-viewer/src/viewer/create-media-cache.ts), combining concurrent transfers for the same file. Different revisions/sessions read separately. Active Blob URLs are released when leaving a file; cached Blobs clear on session changes or viewer closure. Errors and canceled transfers are not cached.

Offscreen-line DOM virtualization is not enabled. In a browser experiment, removing selected lines 2–4 emptied the selected text and collapsed its range. Keeping the original DOM preserves selection, copying and chat-range attachment. Initial transfer and full-DOM rendering costs for large documents remain.

<details>
<summary>Developer guide: building, local installation, npm publishing, preview and verification</summary>

## Building and local installation

This section is for source development/builds; end users can follow installation above. The viewer uses Solid and UnoCSS without React dependencies. The root `.pnpmfile.cjs` excludes only the optional React peer of the MCP SDK 1.7.5 used by this package.

After installing repository dependencies, run these commands in the package directory with Node 24 or later:

```sh
pnpm build
codex plugin marketplace add "$PWD/dist" --json
codex plugin add codex-code-viewer@winter-love-code-viewer --json
```

`dist/plugin` contains the server, HTML, TypeScript standard declarations, `.codex-plugin/plugin.json` and `.mcp.json`. It needs no separate npm install at runtime. `dist/.agents/plugins/marketplace.json` is the local catalog pointing to this bundle.

The installation bundle follows the documented Codex-compatible layout. The original root `plugin.json` plus `extensions.com.openai.mcpServers` appeared in the catalog, but desktop CLI 0.158.0-alpha.2.1 returned no servers from `plugin/read`. After adopting the compatible layout, CLI 0.158.0-alpha.2.1 and local runtime 0.160.0 discovered the server and its then-eight tools. Builds clear the previous installation bundle to avoid retaining an obsolete root manifest.

After installation/update, reopen Codex and look for **Code Viewer** in the conversation right panel's new-tab menu. The conversation entry point follows the `thread` contract in the [extension documentation](https://developers.openai.com/plugins/build/extensions). Inspection of Codex 26.924.22138 found support for listing `thread` tools in the right-panel menu and passing host paths to `file` tools. That inspection did not verify native display or file connection.

The file panel's menu beside **Open** launches external applications; it is not a Code Viewer picker. A `file` entry point is declared, but replacing the built-in `.tsx` viewer has not been verified. Packaging follows the [OpenAI plugin documentation](https://developers.openai.com/plugins/build/plugins).

After code changes, rebuild and run `codex plugin add codex-code-viewer@winter-love-code-viewer --json` to update the installed copy. Reopening the app may be necessary to reload the running server.

## npm publishing

The source [`package.json`](https://github.com/bichikim/web/blob/dev/packages/codex-code-viewer/package.json) controls public access, the installer command, distributed files and dependencies. Runtime libraries are bundled and listed as `devDependencies`. Builds generate executables and license notices in `dist` without a separate npm manifest. `dist/plugin` is the local installation bundle; `dist` is not committed to Git.

```sh
pnpm build
pnpm pack --pack-destination ./dist
# Inspect the tarball and verify standalone execution before publishing.
npm publish ./dist/winter-love-codex-code-viewer-0.4.0.tgz --access public
```

For a new version, update source `package.json`, the plugin manifest and npm version in root `.agents/plugins/marketplace.json` together. The monorepo's `Release packages` Action decides whether to publish based on version. Sources and tags follow the repository [release rules](https://github.com/bichikim/web/blob/dev/RELEASE.md). After a successful npm publish, create and push an `@winter-love/codex-code-viewer@<version>` tag on the same source commit. Normal installation/updates use npm's `latest`, so Git tags are not part of those commands. GitHub-catalog users can select a tag with `--ref`.

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

## Verification and limitations

```sh
pnpm exec vitest run --config vitest.config.ts
pnpm exec tsc --noEmit -p tsconfig.json
```

Integration tests cover alias/barrel resolution, dependency-file changes, path restrictions, MCP conversation/file entry points, missing host paths and stale-position rejection. Viewer tests cover opening the first file, retaining history after failed navigation, focus-refresh/click races, search-response ordering and initial/theme-change handling. Results are recorded per release. Browser AppBridge checks confirmed viewer color changes for light/dark transitions.

A browser check started with an empty conversation panel, opened Puppet's actual `main.tsx` through path input and navigated to the `PuppetEditor` definition on line 127. Native Codex tab selection and replacement of the default `.tsx` viewer were not verified because of app automation restrictions.

After packaging changes, desktop CLI 0.160.0's `mcpServerStatus/list` reported `toolsError: null`, `thread` metadata for `code.panel`, `file` metadata for `code.file` and an HTML resource. `mcpServer/resource/read` loaded the viewer HTML. These checks establish server discovery and UI-resource loading, not native rendering or successful file connection.

TypeScript resolution uses the tsconfig nearest the analyzed file. Bundler-only aliases, browser public URLs and computed dynamic paths are not fully resolved. If a pnpm symlink points to a global store outside the workspace, that dependency's definition cannot open. Completion and symbol rename/refactoring are not included. Editing scope is described above.

</details>
