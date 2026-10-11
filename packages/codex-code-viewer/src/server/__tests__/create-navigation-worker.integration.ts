import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import type {CodeSource} from '../../shared/contracts'
import {createWorkspace} from '../create-workspace'

describe('createNavigationWorker', () => {
  it('should refresh path mappings immediately and keep draft results separate from saved sources', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-worker-')))
    const configure = (target: string): void =>
      writeFileSync(
        join(root, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {noLib: true, paths: {'@helper': [`./${target}`]}, types: []},
        }),
      )
    configure('other.ts')
    writeFileSync(join(root, 'helper.ts'), 'export const greet = () => 1\n')
    writeFileSync(join(root, 'other.ts'), 'export const greet = () => 2\n')
    writeFileSync(join(root, 'caller.ts'), "import {greet} from '@helper'\ngreet()\n")
    const workspace = createWorkspace(root)
    try {
      const document = workspace.read('helper.ts')
      if (!document.ok) {
        throw new Error(document.error.code)
      }
      const input = {
        navigation: 'definition' as const,
        offset: 13,
        path: 'helper.ts',
        revision: document.value.revision,
      }
      const query = async (sources?: readonly CodeSource[]) =>
        (
          await Array.fromAsync(
            workspace.scanNavigation(
              {...input, sources: sources?.slice()},
              new AbortController().signal,
            ),
          )
        ).flatMap((batch) => batch.locations)
      expect(await query()).toEqual([])
      configure('helper.ts')
      expect(await query()).toHaveLength(2)
      expect(
        await query([
          {path: 'caller.ts', source: "import {greet} from '@helper'\ngreet()\ngreet()\n"},
        ]),
      ).toHaveLength(3)
      expect(await query()).toHaveLength(2)
      configure('other.ts')
      expect(await query()).toEqual([])
    } finally {
      workspace.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should stream previews, reuse the worker with fresh sources and recover after cancellation', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-worker-')))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    writeFileSync(join(root, 'helper.ts'), 'export const greet = () => 1\n')
    writeFileSync(join(root, 'first.ts'), "import {greet} from './helper'\ngreet()\n")
    writeFileSync(join(root, 'second.ts'), "import {greet} from './helper'\ngreet()\n")
    const workspace = createWorkspace(root)
    try {
      const document = workspace.read('helper.ts')
      if (!document.ok) {
        throw new Error(document.error.code)
      }
      const input = {
        navigation: 'definition' as const,
        offset: 13,
        path: 'helper.ts',
        revision: document.value.revision,
      }
      const stream = workspace.scanNavigation(input, new AbortController().signal)
      const first = await stream.next()
      if (first.done) {
        throw new Error('Missing reference batch')
      }
      expect(first.value.locations.map((location) => location.path)).toEqual([
        'first.ts',
        'first.ts',
      ])
      const remaining = await Array.fromAsync(stream)
      expect(remaining.flatMap((batch) => batch.locations)).toEqual([
        {column: 9, line: 1, path: 'second.ts', preview: "import {greet} from './helper'\ngreet()"},
        {column: 1, line: 2, path: 'second.ts', preview: 'greet()'},
      ])
      writeFileSync(join(root, 'second.ts'), "import {greet} from './helper'\n\ngreet()\n")
      const refreshed = await Array.fromAsync(
        workspace.scanNavigation(input, new AbortController().signal),
      )
      expect(refreshed.flatMap((batch) => batch.locations).at(-1)?.line).toBe(3)
      const controller = new AbortController()
      const cancelled = workspace.scanNavigation(input, controller.signal)
      const pending = cancelled.next()
      controller.abort()
      await expect(pending).rejects.toThrow()
      const recovered = await Array.fromAsync(
        workspace.scanNavigation(input, new AbortController().signal),
      )
      expect(recovered.flatMap((batch) => batch.locations)).toHaveLength(4)
    } finally {
      workspace.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
})
