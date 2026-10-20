import {chmod, copyFile, cp, mkdir, readdir, readFile, rm, writeFile} from 'node:fs/promises'
import {basename, dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {build as bundle} from 'esbuild'
import {build} from 'vite'
import typescript from '@typescript/typescript6'
import {z} from 'zod'
import {collectLicenseNotices} from './build/collect-license-notices'
import {inlineScript} from './build/inline-script'
import {inlineHtml} from './build/inline-html'
import {bundleRustAnalyzers} from './build/bundle-rust-analyzers'
import {syncPluginVersion} from './build/sync-plugin-version'
import rustAnalyzers from './rust-analyzers.json' with {type: 'json'}
import typescriptAnalyzers from './typescript-analyzers.json' with {type: 'json'}
import {bundleTypescriptAnalyzers} from './build/bundle-typescript-analyzers'
import {createDesktopBundle} from './build/create-desktop-bundle'
import {createCodePlugin} from './build/create-code-plugin'
import {createComposerRuntime} from './build/create-composer-runtime'
import {createPdfRuntime} from './build/create-pdf-runtime'
import {createRuntimeManifest} from './build/create-runtime-manifest'
import manifest from './package.json' with {type: 'json'}

const root = dirname(fileURLToPath(import.meta.url))
const output = `${root}/dist`
await syncPluginVersion({
  marketplacePath: fileURLToPath(
    new URL('../../.agents/plugins/marketplace.json', import.meta.url),
  ),
  packageRoot: root,
})
const result = await build({build: {write: false}, configFile: `${root}/vite.config.ts`, root})
const bundles = Array.isArray(result) ? result : [result]
const assets = bundles.flatMap((entry) => ('output' in entry ? entry.output : []))
const javascript = assets
  .filter((asset) => asset.type === 'chunk')
  .map((asset) => asset.code)
  .join('\n')
const stylesheet = assets
  .flatMap((asset) =>
    asset.type === 'asset' && asset.fileName.endsWith('.css') ? [asset.source] : [],
  )
  .join('\n')
const template = await readFile(`${root}/index.html`, 'utf8')
const html = inlineHtml({entrypoint: '/src/viewer/main.tsx', javascript, stylesheet, template})
await mkdir(output, {recursive: true})
await bundleRustAnalyzers({output, ...rustAnalyzers})
await bundleTypescriptAnalyzers({output, ...typescriptAnalyzers})
const library = dirname(typescript.getDefaultLibFilePath({}))
const declarations = (await readdir(library)).filter(
  (file) => file.startsWith('lib.') && file.endsWith('.d.ts'),
)
await Promise.all(declarations.map((file) => copyFile(`${library}/${file}`, `${output}/${file}`)))
await writeFile(`${output}/app.html`, html)
const browser = await bundle({
  bundle: true,
  entryPoints: [`${root}/src/browser/bridge.ts`],
  format: 'esm',
  metafile: true,
  platform: 'browser',
  target: 'esnext',
  write: false,
})
const browserCode = browser.outputFiles[0]?.text
if (browserCode === undefined) {
  throw new Error('Missing browser host bundle.')
}
await writeFile(
  `${output}/browser.html`,
  [
    '<!doctype html><html lang="ko"><head><meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Code Viewer</title>',
    `<style>${stylesheet}</style></head><body class="m-0 p-0">`,
    '<iframe class="h-screen w-full border-0 block" title="Code Viewer"></iframe>',
    `<script type="module">${inlineScript(browserCode)}</script></body></html>`,
  ].join('\n'),
)
const python = dirname(fileURLToPath(import.meta.resolve('pyright/package.json')))
const pythonManifest = z
  .object({license: z.string(), name: z.string(), version: z.string()})
  .parse(JSON.parse(await readFile(`${python}/package.json`, 'utf8')))
await mkdir(`${output}/python`, {recursive: true})
await cp(`${python}/dist`, `${output}/python/dist`, {
  filter: (path) => !path.endsWith('.map'),
  recursive: true,
})
await Promise.all(
  ['langserver.index.js', 'LICENSE.txt'].map((file) =>
    copyFile(`${python}/${file}`, `${output}/python/${file}`),
  ),
)
await writeFile(
  `${output}/python/package.json`,
  JSON.stringify({...pythonManifest, type: 'commonjs'}, null, 2),
)
const preview = await bundle({
  bundle: true,
  entryPoints: [`${root}/src/preview/main.ts`],
  format: 'esm',
  platform: 'browser',
  target: 'esnext',
  write: false,
})
const previewCode = preview.outputFiles[0]?.text
if (previewCode === undefined) {
  throw new Error('Missing preview host bundle.')
}
await writeFile(
  `${output}/preview.html`,
  [
    '<!doctype html><html lang="ko"><head><meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Code Viewer Preview</title>',
    `<style>${stylesheet}</style></head>`,
    '<body class="m-0 p-0 h-screen flex flex-col bg-surface font-sans text-foreground">',
    '<label class="flex items-center gap-2 px-4 py-2 text-sm">테마 미리보기',
    '<select id="host-theme" aria-label="호스트 테마" class="ui-input py-1">',
    '<option value="system">시스템</option><option value="light">밝게</option><option value="dark">어둡게</option>',
    '</select></label>',
    '<label class="flex items-center gap-2 px-4 pb-2 text-sm">Host language',
    '<select id="host-locale" aria-label="Host language" class="ui-input py-1">',
    '<option value="auto">Browser</option><option value="ko-KR">한국어</option>',
    '<option value="en-US">English</option><option value="ja-JP">日本語 (fallback)</option>',
    '</select></label><details class="px-4 text-sm">',
    '<summary>채팅 컨텍스트 미리보기 (<output>0</output>)</summary>',
    '<ul></ul><button type="button">컨텍스트 비우기</button></details>',
    '<iframe class="min-h-0 flex-1 w-full border-0" title="Code Viewer"></iframe>',
    `<script type="module">${inlineScript(previewCode)}</script></body></html>`,
  ].join('\n'),
)
const server = await bundle({
  banner: {
    js: [
      'import {createRequire as nodeCreateRequire} from "node:module";',
      'import {fileURLToPath as nodeFilePath} from "node:url";',
      'const require = nodeCreateRequire(import.meta.url);',
      'const __filename = nodeFilePath(import.meta.url);',
    ].join('\n'),
  },
  bundle: true,
  entryPoints: {
    browser: `${root}/src/browser/main.ts`,
    claude: `${root}/src/claude/main.ts`,
    'navigation-worker': `${root}/src/server/navigation-worker.ts`,
    'pdf.worker': fileURLToPath(import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')),
    reveal: `${root}/src/browser/reveal.ts`,
    server: `${root}/src/server/main.ts`,
  },
  format: 'esm',
  metafile: true,
  minify: true,
  outdir: output,
  platform: 'node',
  target: 'node24',
})
const installer = await bundle({
  banner: {
    js: [
      '#!/usr/bin/env node',
      'import {createRequire as nodeCreateRequire} from "node:module";',
      'const require = nodeCreateRequire(import.meta.url);',
    ].join('\n'),
  },
  bundle: true,
  entryPoints: [`${root}/src/installer/main.ts`],
  format: 'esm',
  metafile: true,
  outfile: `${output}/install.js`,
  platform: 'node',
  target: 'node24',
})
const EXECUTABLE_MODE = 0o755
const pdfRuntime = await createPdfRuntime({
  architecture: process.arch,
  output,
  platform: process.platform,
})
await chmod(`${output}/install.js`, EXECUTABLE_MODE)
const packageLicenses = await collectLicenseNotices(
  root,
  [
    ...assets.flatMap((asset) => (asset.type === 'chunk' ? Object.keys(asset.modules) : [])),
    ...Object.keys(server.metafile.inputs),
    ...Object.keys(browser.metafile.inputs),
    ...Object.keys(installer.metafile.inputs),
    fileURLToPath(import.meta.resolve('@iconify-json/tabler/icons.json')),
    `${library}/typescript.js`,
    `${python}/langserver.index.js`,
    ...pdfRuntime.modules,
  ],
  {
    ...pdfRuntime.fallbacks,
    // The published package omits the repository's license file.
    '@cfworker/json-schema@4.1.1': await readFile(`${root}/build/licenses/cfworker.txt`, 'utf8'),
    '@iconify-json/tabler@1.2.33': await readFile(`${root}/build/licenses/tabler.txt`, 'utf8'),
    // This version publishes the full license in README.md instead of a standalone file.
    'isarray@1.0.0': await readFile(`${root}/build/licenses/isarray.txt`, 'utf8'),
  },
)
const pdfLicenses = await Promise.all(
  ['cmaps', 'standard_fonts', 'wasm'].map(async (directory) => {
    const path = `${root}/node_modules/pdfjs-dist/${directory}`
    return Promise.all(
      (await readdir(path))
        .filter((file) => file.startsWith('LICENSE'))
        .sort()
        .map(
          async (file) =>
            `## pdfjs-dist/${directory}/${file}\n\n${await readFile(`${path}/${file}`, 'utf8')}`,
        ),
    )
  }),
)
const rustLicenses = await Promise.all(
  ['rust-analyzer-mit.txt', 'rust-analyzer-apache.txt'].map(
    async (file) =>
      `## rust-analyzer/${file}\n\n${await readFile(`${root}/build/licenses/${file}`, 'utf8')}`,
  ),
)
const typescriptNotices = await Promise.all(
  typescriptAnalyzers.assets.map(async ({host}) => {
    const directory = `${output}/typescript/${host}`
    const license = await readFile(`${directory}/LICENSE`, 'utf8')
    const notice = await readFile(`${directory}/NOTICE.txt`, 'utf8')
    return `## TypeScript native ${typescriptAnalyzers.version} ${host}\n\n${license}\n\n${notice}`
  }),
)
const licenses = [
  packageLicenses,
  ...pdfLicenses.flat(),
  ...rustLicenses,
  ...typescriptNotices,
].join('\n\n')
const plugin = `${output}/plugin`
await rm(plugin, {force: true, recursive: true})
await mkdir(`${plugin}/dist`, {recursive: true})
await mkdir(`${plugin}/.codex-plugin`, {recursive: true})
await mkdir(`${output}/.agents/plugins`, {recursive: true})
await Promise.all([
  ...['.codex-plugin/plugin.json', '.mcp.json'].map((file) =>
    copyFile(`${root}/${file}`, `${plugin}/${file}`),
  ),
  ...['server.js', 'navigation-worker.js', 'app.html', 'install.js', ...declarations].map((file) =>
    copyFile(`${output}/${file}`, `${plugin}/dist/${file}`),
  ),
  cp(`${root}/assets`, `${plugin}/assets`, {recursive: true}),
  cp(`${output}/python`, `${plugin}/dist/python`, {recursive: true}),
  ...typescriptAnalyzers.assets.map(async ({host}) => {
    await cp(`${output}/typescript/${host}`, `${plugin}/dist/typescript/${host}`, {
      filter: (path) => !path.endsWith('.tgz'),
      recursive: true,
    })
  }),
  ...rustAnalyzers.assets.map(async ({host}) => {
    const binary = host.startsWith('win32-') ? 'rust-analyzer.exe' : 'rust-analyzer'
    await mkdir(`${plugin}/dist/rust/${host}`, {recursive: true})
    await copyFile(`${output}/rust/${host}/${binary}`, `${plugin}/dist/rust/${host}/${binary}`)
  }),
  copyFile(`${root}/README.md`, `${plugin}/README.md`),
  writeFile(`${plugin}/THIRD_PARTY_LICENSES.md`, licenses),
  writeFile(`${output}/THIRD_PARTY_LICENSES.md`, licenses),
  writeFile(
    `${output}/.agents/plugins/marketplace.json`,
    JSON.stringify(
      {
        interface: {displayName: 'Winter Love Code Viewer'},
        name: 'winter-love-code-viewer',
        plugins: [
          {
            category: 'Developer Tools',
            name: 'codex-code-viewer',
            policy: {authentication: 'ON_INSTALL', installation: 'AVAILABLE'},
            source: {path: './plugin', source: 'local'},
          },
        ],
      },
      null,
      2,
    ),
  ),
])
const desktop = await createDesktopBundle({
  architecture: process.arch,
  output,
  platform: process.platform,
  version: manifest.version,
})
const composerApplication = await createComposerRuntime({
  output,
  platform: process.platform,
  source: `${root}/claude/code/native/composer.swift`,
  version: manifest.version,
})
const codePlugin = await createCodePlugin({
  architecture: process.arch,
  composerApplication,
  hooksDirectory: `${root}/claude/code/hooks`,
  nodeExecutable: process.execPath,
  nodeLicense: join(dirname(dirname(process.execPath)), 'LICENSE'),
  output,
  platform: process.platform,
  version: manifest.version,
})
if (process.platform === 'darwin' && process.arch === 'arm64') {
  await mkdir(`${output}/claude`, {recursive: true})
  const archive = `${output}/claude/${basename(codePlugin)}`
  await copyFile(codePlugin, archive)
  await createRuntimeManifest({archive, host: 'darwin-arm64', version: manifest.version})
}
console.log(
  [
    `Built Codex plugin marketplace: ${output}`,
    `Built Claude Desktop extension: ${desktop}`,
    `Built Claude Code plugin: ${codePlugin}`,
  ].join('\n'),
)
