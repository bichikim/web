import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {strFromU8, unzipSync} from 'fflate'
import {expect, it} from 'vitest'
import {createDesktopBundle} from '../create-desktop-bundle'

it('should package a standalone desktop server with folder configuration and runtime assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'desktop-bundle-'))
  try {
    await mkdir(join(root, 'python'), {recursive: true})
    await mkdir(join(root, 'pdf-assets'))
    await mkdir(join(root, 'node_modules', '@napi-rs', 'canvas'), {recursive: true})
    await mkdir(join(root, 'rust', 'darwin-arm64'), {recursive: true})
    await mkdir(join(root, 'rust', 'darwin-arm64', 'cache'))
    await writeFile(join(root, 'rust', 'darwin-arm64', 'cache', 'archive.gz'), 'download cache')
    await Promise.all(
      [
        'claude.js',
        'app.html',
        'navigation-worker.js',
        'pdf.worker.js',
        'pdf-assets/font.dat',
        'node_modules/@napi-rs/canvas/LICENSE',
        'lib.es5.d.ts',
        'THIRD_PARTY_LICENSES.md',
        'python/langserver.index.js',
        'rust/darwin-arm64/rust-analyzer',
      ].map((file) => writeFile(join(root, file), file)),
    )
    const path = await createDesktopBundle({
      architecture: 'arm64',
      output: root,
      platform: 'darwin',
      version: '1.2.3',
    })
    const entries = unzipSync(await readFile(path))
    const manifest = JSON.parse(strFromU8(entries['manifest.json']))
    expect(manifest).toMatchObject({
      compatibility: {platforms: ['darwin'], runtimes: {node: '>=24'}},
      server: {
        entry_point: 'dist/claude.js',
        mcp_config: {args: [`\${__dirname}/dist/claude.js`, `\${user_config.workspace}`]},
      },
      user_config: {workspace: {required: true, type: 'directory'}},
      version: '1.2.3',
    })
    expect(strFromU8(entries['package.json'])).toContain('"type": "module"')
    expect(entries['dist/python/langserver.index.js']).toBeDefined()
    expect(entries['dist/pdf.worker.js']).toBeDefined()
    expect(entries['dist/node_modules/@napi-rs/canvas/LICENSE']).toBeDefined()
    expect(entries['dist/rust/darwin-arm64/rust-analyzer']).toBeDefined()
    expect(Object.keys(entries).some((name) => name.includes('cache'))).toBe(false)
    expect(Object.keys(entries)).not.toContain('dist/server.js')
  } finally {
    await rm(root, {force: true, recursive: true})
  }
})
