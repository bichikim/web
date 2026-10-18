/** @vitest-environment node */
import {chmod, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {basename, join} from 'node:path'
import {strFromU8, unzipSync} from 'fflate'
import {expect, it, vi} from 'vitest'
import {createCodePlugin} from '../create-code-plugin'
interface BundleOptions {
  readonly entryPoints: readonly string[]
  readonly outdir?: string
}

vi.mock('esbuild', () => ({
  build: vi.fn(async ({entryPoints, outdir}: BundleOptions) => ({
    outputFiles: entryPoints.map((entry) => ({
      contents: new TextEncoder().encode('export function register() {}'),
      path: join(outdir ?? '.', basename(entry)),
    })),
  })),
}))

it('should package a project-scoped Code plugin with an open command and its own runtime', async () => {
  const root = await mkdtemp(join(tmpdir(), 'code-plugin-'))
  try {
    await mkdir(join(root, 'python'))
    await mkdir(join(root, 'hooks'))
    await mkdir(join(root, 'composer.app/Contents/MacOS'), {recursive: true})
    await mkdir(join(root, 'pdf-assets'))
    await mkdir(join(root, 'node_modules', '@napi-rs', 'canvas'), {recursive: true})
    await mkdir(join(root, 'node_modules', '@napi-rs', 'canvas-darwin-arm64'))
    await mkdir(join(root, 'node_modules', 'unrelated-package'))
    await writeFile(join(root, 'hooks', 'hooks.json'), '{"modules":["./register.js"]}')
    await writeFile(join(root, 'hooks', 'register.js'), 'export function register() {}')
    await writeFile(
      join(root, 'hooks', 'read-tool-location.ts'),
      'export const readToolLocation = () => undefined',
    )
    await writeFile(
      join(root, 'hooks', 'can-approve-open.ts'),
      'export const canApproveOpen = () => false',
    )
    await writeFile(join(root, 'hooks', 'pane-state.ts'), 'export const emptyPane = () => ({})')
    await mkdir(join(root, 'rust', 'darwin-arm64'), {recursive: true})
    await Promise.all(
      [
        'browser.js',
        'reveal.js',
        'browser.html',
        'app.html',
        'navigation-worker.js',
        'pdf.worker.js',
        'pdf-assets/font.dat',
        'node_modules/@napi-rs/canvas/LICENSE',
        'node_modules/@napi-rs/canvas-darwin-arm64/canvas.node',
        'node_modules/unrelated-package/index.js',
        'lib.es5.d.ts',
        'THIRD_PARTY_LICENSES.md',
        'python/langserver.index.js',
        'rust/darwin-arm64/rust-analyzer',
        'node',
        'composer.app/Contents/MacOS/composer',
        'LICENSE',
      ].map((file) => writeFile(join(root, file), file)),
    )
    await chmod(join(root, 'node'), 0o755)
    await chmod(join(root, 'composer.app/Contents/MacOS/composer'), 0o755)
    const archive = await createCodePlugin({
      architecture: 'arm64',
      composerApplication: join(root, 'composer.app'),
      hooksDirectory: join(root, 'hooks'),
      nodeExecutable: join(root, 'node'),
      nodeLicense: join(root, 'LICENSE'),
      output: root,
      platform: 'darwin',
      version: '1.2.3',
    })
    const entries = unzipSync(await readFile(archive))
    expect(JSON.parse(strFromU8(entries['.claude-plugin/plugin.json']))).toMatchObject({
      commands: {open: {content: expect.stringContaining('code.browser')}},
      mcpServers: {
        viewer: {
          args: [`\${CLAUDE_PLUGIN_ROOT}/dist/browser.js`, `\${CLAUDE_PROJECT_DIR}`],
          command: `\${CLAUDE_PLUGIN_ROOT}/runtime/node`,
          env: {CODE_VIEWER_CLIPBOARD: 'true'},
        },
      },
      name: 'code-viewer',
      version: '1.2.3',
    })
    expect(strFromU8(entries['runtime/node'])).toBe('node')
    expect(strFromU8(entries['runtime/Code Viewer Attachment.app/Contents/MacOS/composer'])).toBe(
      'composer.app/Contents/MacOS/composer',
    )
    expect(strFromU8(entries['runtime/LICENSE'])).toBe('LICENSE')
    expect(JSON.parse(strFromU8(entries['package.json']))).toMatchObject({type: 'module'})
    expect(entries['dist/browser.html']).toBeDefined()
    expect(entries['dist/reveal.js']).toBeDefined()
    expect(entries['dist/app.html']).toBeDefined()
    expect(entries['dist/pdf.worker.js']).toBeDefined()
    expect(entries['dist/pdf-assets/font.dat']).toBeDefined()
    expect(entries['dist/node_modules/@napi-rs/canvas/LICENSE']).toBeDefined()
    expect(entries['dist/node_modules/@napi-rs/canvas-darwin-arm64/canvas.node']).toBeDefined()
    expect(entries['dist/node_modules/unrelated-package/index.js']).toBeUndefined()
    expect(entries['dist/python/langserver.index.js']).toBeDefined()
    expect(entries['dist/rust/darwin-arm64/rust-analyzer']).toBeDefined()
    expect(entries['dist/lib.es5.d.ts']).toBeDefined()
    expect(entries['dist/claude.js']).toBeUndefined()
    const hooks = JSON.parse(strFromU8(entries['hooks/hooks.json']))
    expect(hooks.modules).toEqual(['./register.js'])
    expect(entries['hooks/register.js']).toBeDefined()
    expect(entries['hooks/register-pane.js']).toBeDefined()
    expect(entries['hooks/tree-client.js']).toBeDefined()
    expect(entries['hooks/file-row-client.js']).toBeDefined()
    expect(entries['hooks/editor-client.js']).toBeDefined()
    expect(entries['hooks/source-input-client.js']).toBeDefined()
    expect(entries['hooks/image-client.js']).toBeDefined()
    expect(entries['hooks/splitter-client.js']).toBeDefined()
    expect(entries['hooks/sidebar-resize-client.js']).toBeDefined()
    expect(entries['hooks/control-client.js']).toBeDefined()
    expect(entries['hooks/popover-client.js']).toBeDefined()
    expect(entries['hooks/horizontal-client.js']).toBeDefined()
    expect(entries['hooks/resize-client.js']).toBeUndefined()
    expect(Object.keys(entries).some((name) => name.includes('__tests__'))).toBe(false)
  } finally {
    await rm(root, {force: true, recursive: true})
  }
})
