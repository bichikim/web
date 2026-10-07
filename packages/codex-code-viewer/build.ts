import {chmod, copyFile, cp, mkdir, readdir, readFile, rm, writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {build as bundle} from 'esbuild'
import {build} from 'vite'
import typescript from '@typescript/typescript6'
import {collectLicenseNotices} from './build/collect-license-notices'
import {inlineScript} from './build/inline-script'
import {inlineHtml} from './build/inline-html'

const root = dirname(fileURLToPath(import.meta.url))
const output = `${root}/dist`
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
const library = dirname(typescript.getDefaultLibFilePath({}))
const declarations = (await readdir(library)).filter(
  (file) => file.startsWith('lib.') && file.endsWith('.d.ts'),
)
await Promise.all(declarations.map((file) => copyFile(`${library}/${file}`, `${output}/${file}`)))
await writeFile(`${output}/app.html`, html)
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
    '<select aria-label="호스트 테마" class="ui-input py-1">',
    '<option value="system">시스템</option><option value="light">밝게</option><option value="dark">어둡게</option>',
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
  entryPoints: [`${root}/src/server/main.ts`],
  format: 'esm',
  metafile: true,
  outfile: `${output}/server.js`,
  platform: 'node',
  target: 'node24',
})
const manifest = JSON.parse(await readFile(`${root}/package.json`, 'utf8'))
const installer = await bundle({
  banner: {js: '#!/usr/bin/env node'},
  bundle: true,
  entryPoints: [`${root}/src/installer/main.ts`],
  format: 'esm',
  metafile: true,
  outfile: `${output}/install.js`,
  platform: 'node',
  target: 'node24',
})
const EXECUTABLE_MODE = 0o755
await chmod(`${output}/install.js`, EXECUTABLE_MODE)
const packageLicenses = await collectLicenseNotices(
  root,
  [
    ...assets.flatMap((asset) => (asset.type === 'chunk' ? Object.keys(asset.modules) : [])),
    ...Object.keys(server.metafile.inputs),
    ...Object.keys(installer.metafile.inputs),
    fileURLToPath(import.meta.resolve('@iconify-json/tabler/icons.json')),
    `${library}/typescript.js`,
  ],
  {
    // The published package omits the repository's license file.
    '@cfworker/json-schema@4.1.1': await readFile(`${root}/build/licenses/cfworker.txt`, 'utf8'),
    '@iconify-json/tabler@1.2.33': await readFile(`${root}/build/licenses/tabler.txt`, 'utf8'),
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
const licenses = `${packageLicenses}\n${pdfLicenses.flat().join('\n\n')}\n`
const plugin = `${output}/plugin`
await rm(plugin, {force: true, recursive: true})
await mkdir(`${plugin}/dist`, {recursive: true})
await mkdir(`${plugin}/.codex-plugin`, {recursive: true})
await mkdir(`${output}/.agents/plugins`, {recursive: true})
await Promise.all([
  ...['.codex-plugin/plugin.json', '.mcp.json'].map((file) =>
    copyFile(`${root}/${file}`, `${plugin}/${file}`),
  ),
  ...['server.js', 'app.html', 'install.js', ...declarations].map((file) =>
    copyFile(`${output}/${file}`, `${plugin}/dist/${file}`),
  ),
  cp(`${root}/assets`, `${plugin}/assets`, {recursive: true}),
  copyFile(`${root}/README.md`, `${plugin}/README.md`),
  writeFile(`${plugin}/THIRD_PARTY_LICENSES.md`, licenses),
  writeFile(
    `${plugin}/package.json`,
    JSON.stringify(
      {
        bin: {'codex-code-viewer': './dist/install.js'},
        description: manifest.description,
        engines: manifest.engines,
        files: ['.codex-plugin', '.mcp.json', 'assets', 'dist', 'THIRD_PARTY_LICENSES.md'],
        homepage: 'https://github.com/bichikim/web',
        keywords: ['codex', 'codex-plugin', 'code-viewer', 'mcp', 'typescript'],
        name: manifest.name,
        publishConfig: {access: 'public', registry: 'https://registry.npmjs.org'},
        repository: {
          directory: 'packages/codex-code-viewer',
          type: 'git',
          url: 'git+https://github.com/bichikim/web.git',
        },
        type: 'module',
        version: manifest.version,
      },
      null,
      2,
    ),
  ),
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
console.log(`Built Codex plugin marketplace: ${output}`)
