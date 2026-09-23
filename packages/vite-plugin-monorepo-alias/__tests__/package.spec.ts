import {execFileSync} from 'node:child_process'
import {copyFileSync, mkdtempSync, rmSync} from 'node:fs'
import {createRequire} from 'node:module'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {it} from 'vitest'

it('should pack resolvable public exports for ESM and CommonJS consumers', () => {
  const root = path.resolve(import.meta.dirname, '..')
  const output = mkdtempSync(path.join(tmpdir(), 'alias-package-'))
  const require = createRequire(import.meta.url)
  const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js')

  try {
    execFileSync(process.execPath, [vite, 'build', '--outDir', path.join(output, 'dist')], {
      cwd: root,
      stdio: 'pipe',
    })
    copyFileSync(path.join(root, 'package.json'), path.join(output, 'package.json'))
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        String.raw`
      import assert from 'node:assert/strict'
      import {execFileSync} from 'node:child_process'
      import {readFileSync} from 'node:fs'
      import {createRequire} from 'node:module'

      const require = createRequire(import.meta.url)
      const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
      const packResult = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {encoding: 'utf8'})
      const [packed] = JSON.parse(packResult)
      const files = new Set(packed.files.map(file => file.path))
      const checkTargets = target => {
        if (typeof target === 'string') {
          assert.ok(files.has(target.replace(/^\.\//u, '')), target)
        } else {
          Object.values(target).forEach(checkTargets)
        }
      }
      for (const [subpath, target] of Object.entries(manifest.exports)) {
        if (!subpath.includes('*')) checkTargets(target)
      }
      for (const load of [specifier => import(specifier), specifier => require(specifier)]) {
        const root = await load(manifest.name)
        const plugin = await load(manifest.name + '/plugin')
        assert.equal(typeof plugin.createAlias, 'function')
        assert.equal(plugin.createAlias, root.createAlias)
        assert.equal(plugin.monorepoAlias, root.monorepoAlias)
        assert.equal(typeof plugin.createAlias({}).resolveId, 'function')
      }
    `,
      ],
      {cwd: output, stdio: 'pipe'},
    )
  } finally {
    rmSync(output, {force: true, recursive: true})
  }
})
