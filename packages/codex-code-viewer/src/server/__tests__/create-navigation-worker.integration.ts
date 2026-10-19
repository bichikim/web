import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import type {CodeSource} from '../../shared/contracts'
import {createWorkspace} from '../create-workspace'

describe('createNavigationWorker', () => {
  it('should preserve alias references, definitions and edited sources after warming', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-warmup-')))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    writeFileSync(join(root, 'helper.ts'), 'export const greet = () => 1\n')
    writeFileSync(join(root, 'barrel.ts'), "export {greet as welcome} from './helper'\n")
    writeFileSync(join(root, 'caller.ts'), "import {welcome as hello} from './barrel'\nhello()\n")
    const workspace = createWorkspace(root)
    try {
      expect(await workspace.warmNavigation('helper.ts')).toBe(true)
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
      const query = async () =>
        (
          await Array.fromAsync(workspace.scanNavigation(input, new AbortController().signal))
        ).flatMap((batch) => batch.locations)
      const baseline = await workspace.references('helper.ts', 13)
      if (!baseline.ok) {
        throw new Error(baseline.error.code)
      }
      expect((await query()).map(({path, line, column}) => ({column, line, path}))).toEqual(
        baseline.value,
      )
      expect(baseline.value.filter((location) => location.path === 'caller.ts')).toHaveLength(3)
      writeFileSync(
        join(root, 'caller.ts'),
        "import {welcome as hello} from './barrel'\nhello()\nhello()\n",
      )
      expect(await workspace.warmNavigation('helper.ts')).toBe(true)
      expect((await query()).filter((location) => location.path === 'caller.ts')).toHaveLength(4)
      const caller = workspace.read('caller.ts')
      if (!caller.ok) {
        throw new Error(caller.error.code)
      }
      const definitions = (
        await Array.fromAsync(
          workspace.scanNavigation(
            {
              navigation: 'definition',
              offset: caller.value.source.lastIndexOf('hello'),
              path: 'caller.ts',
              revision: caller.value.revision,
            },
            new AbortController().signal,
          ),
        )
      ).flatMap((batch) => batch.locations)
      expect(definitions.map(({path, line, column}) => ({column, line, path}))).toEqual([
        {column: 14, line: 1, path: 'helper.ts'},
      ])
      expect(await workspace.warmNavigation('missing.py')).toBe(false)
      expect((await query()).filter((location) => location.path === 'caller.ts')).toHaveLength(4)
      const closing = workspace.warmNavigation('helper.ts')
      workspace.dispose()
      expect(await closing).toBe(false)
    } finally {
      workspace.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
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
      expect(first.value.groups).toEqual([
        {count: 1, path: 'first.ts'},
        {count: 1, path: 'second.ts'},
      ])
      expect(first.value.locations).toEqual([])
      const details = await stream.next()
      if (details.done) {
        throw new Error('Missing reference details')
      }
      expect(details.value.locations.map((location) => location.path)).toEqual(['first.ts'])
      const remaining = await Array.fromAsync(stream)
      expect(
        [...details.value.locations, ...remaining.flatMap((batch) => batch.locations)].sort(
          (left, right) => left.path.localeCompare(right.path) || left.line - right.line,
        ),
      ).toEqual([
        {column: 9, line: 1, path: 'first.ts', preview: "import {greet} from './helper'\ngreet()"},
        {column: 1, line: 2, path: 'first.ts', preview: 'greet()'},
        {column: 9, line: 1, path: 'second.ts', preview: "import {greet} from './helper'\ngreet()"},
        {column: 1, line: 2, path: 'second.ts', preview: 'greet()'},
      ])
      expect(remaining.findLast((batch) => batch.groups !== undefined)?.groups).toEqual([
        {count: 2, path: 'first.ts'},
        {count: 2, path: 'second.ts'},
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
