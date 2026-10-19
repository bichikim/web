import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {describe, expect, it, vi} from 'vitest'
import type {NavigationLocation} from '../../shared/contracts'
import {createWorkspace} from '../create-workspace'

const key = (location: NavigationLocation): string =>
  JSON.stringify([location.path, location.line, location.column])
describe('createWorkspace project declaration navigation', () => {
  it('should retain aliases on repeat, file changes and restart, and invalidate changed declaration maps', async () => {
    const directory = realpathSync(mkdtempSync(join(tmpdir(), 'workspace-declarations-')))
    const root = join(directory, 'workspace')
    const write = (path: string, source: string): void => {
      mkdirSync(dirname(join(root, path)), {recursive: true})
      writeFileSync(join(root, path), source)
    }
    write(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: {module: 'esnext', moduleResolution: 'bundler', noLib: true, types: []},
      }),
    )
    write('core/source.ts', 'export function greet() {}')
    write('core/other.ts', 'export function greet() {}')
    write(
      'core/dist/source.d.ts',
      'export declare function greet(): void;\n//# sourceMappingURL=source.d.ts.map',
    )
    const map = (source: string): string =>
      JSON.stringify({file: 'source.d.ts', mappings: '', sources: [source], version: 3})
    write('core/dist/source.d.ts.map', map('../source.ts'))
    write(
      'apps/tsconfig.json',
      JSON.stringify({
        compilerOptions: {paths: {'@api': ['../core/dist/source.d.ts']}},
        extends: '../tsconfig.json',
      }),
    )
    write('apps/use.ts', "import {greet as hello} from '@api'; hello()")
    write('direct.ts', "import {greet} from './core/source'; greet()")
    vi.stubEnv('CODEX_HOME', join(directory, 'cache'))
    let workspace = createWorkspace(root)
    const query = async (): Promise<string[]> => {
      const document = workspace.read('core/source.ts')
      if (!document.ok) {
        throw new Error(document.error.code)
      }
      const batches = await Array.fromAsync(
        workspace.scanNavigation(
          {
            navigation: 'definition',
            offset: 16,
            path: document.value.location.path,
            revision: document.value.revision,
          },
          new AbortController().signal,
        ),
      )
      return [...new Set(batches.flatMap((batch) => batch.locations.map(key)))].sort()
    }
    try {
      const expected = [
        JSON.stringify(['apps/use.ts', 1, 9]),
        JSON.stringify(['apps/use.ts', 1, 18]),
        JSON.stringify(['apps/use.ts', 1, 38]),
        JSON.stringify(['direct.ts', 1, 9]),
        JSON.stringify(['direct.ts', 1, 38]),
      ].sort()
      const initial = await query()
      expect(initial).toEqual(expected)
      expect(await query()).toEqual(expected)
      write('apps/added.ts', "import {greet as added} from '@api'; added()")
      const added = await query()
      expect(added).toEqual(
        [
          ...expected,
          JSON.stringify(['apps/added.ts', 1, 9]),
          JSON.stringify(['apps/added.ts', 1, 18]),
          JSON.stringify(['apps/added.ts', 1, 38]),
        ].sort(),
      )
      workspace.dispose()
      workspace = createWorkspace(root)
      expect(await query()).toEqual(added)
      write('core/dist/source.d.ts.map', map('../other.ts'))
      expect(await query()).toEqual(expected.filter((position) => position.includes('direct.ts')))
    } finally {
      workspace.dispose()
      vi.unstubAllEnvs()
      rmSync(directory, {force: true, recursive: true})
    }
  })
})
