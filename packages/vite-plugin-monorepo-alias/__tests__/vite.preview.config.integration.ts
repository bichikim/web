import {execFileSync} from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {createRequire} from 'node:module'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {expect, it} from 'vitest'

it('should build executable preview bundles without replacing release output', () => {
  const root = path.resolve(import.meta.dirname, '..')
  const fixture = mkdtempSync(path.join(tmpdir(), 'alias-preview-'))
  const require = createRequire(import.meta.url)
  const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js')

  try {
    copyFileSync(path.join(root, 'package.json'), path.join(fixture, 'package.json'))
    copyFileSync(
      path.join(root, 'vite.preview.config.mts'),
      path.join(fixture, 'vite.preview.config.mts'),
    )
    cpSync(path.join(root, 'src'), path.join(fixture, 'src'), {recursive: true})
    symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir')
    mkdirSync(path.join(fixture, 'dist'))
    writeFileSync(path.join(fixture, 'dist/index.mjs'), 'release output')

    execFileSync(process.execPath, [vite, 'build', '-c', 'vite.preview.config.mts'], {
      cwd: fixture,
      stdio: 'pipe',
    })
    expect(readFileSync(path.join(fixture, 'dist/index.mjs'), 'utf8')).toBe('release output')
    const output = path.join(fixture, '.cache/preview')
    expect(readdirSync(output)).toEqual(
      expect.arrayContaining([expect.stringMatching(/\.js$/u), expect.stringMatching(/\.mjs$/u)]),
    )
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        String.raw`
      import assert from 'node:assert/strict'
      import {readdirSync} from 'node:fs'
      import {createRequire} from 'node:module'
      import path from 'node:path'
      import {pathToFileURL} from 'node:url'

      const require = createRequire(import.meta.url)
      for (const file of readdirSync(process.argv[1])) {
        const target = path.join(process.argv[1], file)
        const plugin = file.endsWith('.mjs') ? await import(pathToFileURL(target).href) : require(target)
        const alias = plugin.createAlias({root: '/repo', workspacePaths: ['packages/']})
        const resolved = await alias.resolveId.call(
          {resolve: async id => ({id})}, 'src/value', '/repo/packages/demo/src/index.ts', {},
        )
        assert.deepEqual(resolved, {id: path.join('/repo', 'packages/demo/src/value')})
      }
    `,
        output,
      ],
      {cwd: fixture, stdio: 'pipe'},
    )
  } finally {
    rmSync(fixture, {force: true, recursive: true})
  }
})
