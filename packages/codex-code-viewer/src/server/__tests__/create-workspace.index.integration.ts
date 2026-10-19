import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it, vi} from 'vitest'
import {createWorkspace} from '../create-workspace'
import * as stores from '../navigation-cache/create-source-index-store'
import type {NavigationLocation} from '../../shared/contracts'

const key = (location: NavigationLocation): string =>
  JSON.stringify([location.path, location.line, location.column])
describe('createWorkspace persisted candidate index', () => {
  it('should stream cross-package aliases without loading an unused candidate index', async () => {
    const directory = realpathSync(mkdtempSync(join(tmpdir(), 'workspace-delayed-index-')))
    const root = join(directory, 'workspace')
    mkdirSync(join(root, 'packages/core'), {recursive: true})
    mkdirSync(join(root, 'apps/consumer'), {recursive: true})
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    writeFileSync(join(root, 'packages/core/entry.ts'), 'export function greet() {}')
    writeFileSync(
      join(root, 'apps/consumer/use.ts'),
      "import {greet as welcome} from '../../packages/core/entry'; welcome()",
    )
    vi.stubEnv('CODEX_HOME', join(directory, 'cache'))
    const loaded = vi.fn()
    const release = Promise.withResolvers<void>()
    const seed = createWorkspace(root)
    let restarted: ReturnType<typeof createWorkspace> | undefined
    try {
      const document = seed.read('packages/core/entry.ts')
      if (!document.ok) {
        throw new Error(document.error.code)
      }
      const input = {
        navigation: 'definition' as const,
        offset: 16,
        path: document.value.location.path,
        revision: document.value.revision,
      }
      await Array.fromAsync(seed.scanNavigation(input, new AbortController().signal))
      seed.dispose()
      const original = stores.createSourceIndexStore
      vi.spyOn(stores, 'createSourceIndexStore').mockImplementation((options) => {
        const storage = original(options)
        return {
          ...storage,
          read: async (signal) => {
            loaded()
            await release.promise
            return storage.read(signal)
          },
        }
      })
      restarted = createWorkspace(root)
      const stream = restarted.scanNavigation(input, new AbortController().signal)
      const next = stream.next()
      let first = await next
      while (!first.done && first.value.locations.length === 0) {
        // oxlint-disable-next-line no-await-in-loop -- Consume empty progress until a real semantic result arrives.
        first = await stream.next()
      }
      expect(first.done).toBe(false)
      if (first.done) {
        throw new Error('Missing first semantic batch')
      }
      expect(first.value.locations.some(({path}) => path === 'apps/consumer/use.ts')).toBe(true)
      release.resolve()
      const locations = [first.value, ...(await Array.fromAsync(stream))].flatMap(
        (batch) => batch.locations,
      )
      const complete = await restarted.references(input.path, input.offset)
      if (!complete.ok) {
        throw new Error(complete.error.code)
      }
      expect([...new Set(locations.map(key))].sort()).toEqual(complete.value.map(key).sort())
      expect(loaded).not.toHaveBeenCalled()
    } finally {
      release.resolve()
      seed.dispose()
      restarted?.dispose()
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
      rmSync(directory, {force: true, recursive: true})
    }
  })
  it('should complete aliases across packages on cold start, restart and filesystem changes', async () => {
    const directory = realpathSync(mkdtempSync(join(tmpdir(), 'workspace-persisted-index-')))
    const root = join(directory, 'workspace')
    mkdirSync(join(root, 'packages/core'), {recursive: true})
    mkdirSync(join(root, 'apps/consumer'), {recursive: true})
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: [packages/*, apps/*]')
    writeFileSync(
      join(root, 'tsconfig.json'),
      '{"compilerOptions":{"noLib":true,"types":[],"moduleResolution":"bundler"}}',
    )
    const source = 'export function greet() {}'
    writeFileSync(join(root, 'packages/core/entry.ts'), source)
    writeFileSync(
      join(root, 'packages/core/local.ts'),
      "import {greet as hello} from './entry'; hello()",
    )
    writeFileSync(
      join(root, 'apps/consumer/barrel.ts'),
      "export {greet as welcome} from '../../packages/core/entry'",
    )
    writeFileSync(join(root, 'apps/consumer/next.ts'), "export {welcome as invoke} from './barrel'")
    writeFileSync(
      join(root, 'apps/consumer/use.ts'),
      "import {invoke as hello} from './next'; hello()",
    )
    writeFileSync(
      join(root, 'apps/consumer/namespace.ts'),
      "import * as api from './barrel'; api.welcome()",
    )
    for (let index = 0; index < 300; index += 1) {
      writeFileSync(join(root, `unrelated-${index}.ts`), 'export function greet() {}')
    }
    vi.stubEnv('CODEX_HOME', join(directory, 'cache'))
    const query = async () => {
      const workspace = createWorkspace(root)
      try {
        const read = workspace.read('packages/core/entry.ts')
        if (!read.ok) {
          throw new Error(read.error.code)
        }
        const input = {
          navigation: 'definition' as const,
          offset: source.indexOf('greet'),
          path: read.value.location.path,
          revision: read.value.revision,
        }
        const batches = await Array.fromAsync(
          workspace.scanNavigation(input, new AbortController().signal),
        )
        const locations = [
          ...new Map(
            batches
              .flatMap((batch) => batch.locations)
              .map((location) => [key(location), location]),
          ).values(),
        ]
        const complete = await workspace.references(input.path, input.offset)
        if (!complete.ok) {
          throw new Error(complete.error.code)
        }
        expect(locations.map(key).sort()).toEqual(complete.value.map(key).sort())
        expect(locations.some((location) => location.path.startsWith('unrelated-'))).toBe(false)
        return locations
      } finally {
        workspace.dispose()
      }
    }
    try {
      const initial = await query()
      expect(initial).toEqual(
        expect.arrayContaining([
          expect.objectContaining({column: 41, line: 1, path: 'apps/consumer/use.ts'}),
          expect.objectContaining({column: 38, line: 1, path: 'apps/consumer/namespace.ts'}),
        ]),
      )
      expect((await query()).map(key).sort()).toEqual(initial.map(key).sort())
      rmSync(join(root, 'apps/consumer/use.ts'))
      writeFileSync(
        join(root, 'apps/consumer/new.ts'),
        "import {invoke as changed} from './next'; changed()",
      )
      const updated = await query()
      expect(updated.some((location) => location.path === 'apps/consumer/use.ts')).toBe(false)
      expect(updated).toContainEqual(
        expect.objectContaining({column: 43, line: 1, path: 'apps/consumer/new.ts'}),
      )
    } finally {
      vi.unstubAllEnvs()
      rmSync(directory, {force: true, recursive: true})
    }
  })
})
