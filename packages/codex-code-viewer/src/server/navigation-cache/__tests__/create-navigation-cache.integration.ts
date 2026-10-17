import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {readFile} from 'node:fs/promises'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {NavigationInput, NavigationLocation} from '../../../shared/contracts'
import type {FileChange} from '../../create-file-index'
import {createWorkspace} from '../../create-workspace'
import {resolveNavigation} from '../../resolve-navigation'
import {streamNavigation} from '../../stream-navigation'
import {createNavigationCache} from '../create-navigation-cache'
import {createNavigationIndex} from '../create-navigation-index'

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  return {...actual, readFile: vi.fn(actual.readFile)}
})

const sorted = (locations: readonly NavigationLocation[]) =>
  [...locations].sort(
    (left, right) =>
      left.path.localeCompare(right.path) || left.line - right.line || left.column - right.column,
  )

describe('createNavigationCache integration', () => {
  let root: string
  let workspace: ReturnType<typeof createWorkspace>
  let notifyChange: (change: FileChange) => void
  let cache: ReturnType<typeof createNavigationCache>
  let input: NavigationInput
  const analyze = vi.fn()
  const changed = async (path: string, operation: () => void): Promise<void> => {
    operation()
    notifyChange({event: 'rename', path})
  }
  const query = async (request = input) =>
    sorted(
      (await Array.fromAsync(cache.scan(request, new AbortController().signal))).flatMap(
        (batch) => batch.locations,
      ),
    )
  const fresh = async (request = input) => {
    const document = workspace.read(request.path)
    if (!document.ok) {
      throw new Error(document.error.code)
    }
    const result = await resolveNavigation({...request, document: document.value, workspace})
    if (!result.ok) {
      throw new Error(result.error.code)
    }
    return result.value.locations
  }
  it('should discover new renamed callers behind external reexports after caching references', async () => {
    mkdirSync(join(root, 'node_modules/external'), {recursive: true})
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'esnext',
          moduleResolution: 'bundler',
          noLib: true,
          types: [],
        },
      }),
    )
    writeFileSync(
      join(root, 'node_modules/external/index.ts'),
      "export {greet as welcome} from '../../helper'",
    )
    await query()
    await changed('later.ts', () =>
      writeFileSync(join(root, 'later.ts'), "import {welcome} from 'external'\nwelcome()\n"),
    )
    const updated = await query()
    expect(updated).toEqual(
      expect.arrayContaining([{column: 1, line: 2, path: 'later.ts', preview: 'welcome()'}]),
    )
    expect(updated).toEqual(sorted(await fresh()))
  })
  it('should invalidate cached references for callers using a different conditional export mode', async () => {
    mkdirSync(join(root, 'bridge'))
    mkdirSync(join(root, 'node_modules'))
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'nodenext',
          moduleResolution: 'nodenext',
          noLib: true,
          types: [],
        },
      }),
    )
    writeFileSync(
      join(root, 'bridge/package.json'),
      JSON.stringify({
        exports: {import: './esm.mts', require: './cjs.cts'},
        name: 'bridge',
        type: 'module',
      }),
    )
    writeFileSync(join(root, 'bridge/esm.mts'), "export {greet as welcome} from '../helper.js'")
    writeFileSync(join(root, 'bridge/cjs.cts'), 'export function welcome() {}')
    symlinkSync(join(root, 'bridge'), join(root, 'node_modules/bridge'), 'dir')
    await query()
    await changed('later.mts', () =>
      writeFileSync(join(root, 'later.mts'), "import {welcome} from 'bridge'\nwelcome()\n"),
    )
    expect(await query()).toEqual(
      expect.arrayContaining([{column: 1, line: 2, path: 'later.mts', preview: 'welcome()'}]),
    )
    expect(await query()).toEqual(sorted(await fresh()))
  })
  beforeEach(() => {
    vi.mocked(readFile).mockClear()
    root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-cache-')))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    writeFileSync(join(root, 'helper.ts'), 'export const greet = () => 1\n')
    writeFileSync(join(root, 'first.ts'), "import {greet} from './helper'\ngreet()\n")
    writeFileSync(join(root, 'second.ts'), "import {greet} from './helper'\ngreet()\n")
    writeFileSync(join(root, 'unrelated.ts'), 'export const other = 1\n')
    workspace = createWorkspace(root)
    analyze.mockReset()
    const index = createNavigationIndex({
      changes: {
        subscribeChanges: (listener) => {
          notifyChange = listener
          return () => {}
        },
      },
      onConfigurationChange: () => {
        workspace.dispose()
        workspace = createWorkspace(root)
      },
      root,
    })
    cache = createNavigationCache({
      index,
      read: (path) => workspace.read(path),
      scan: async function* (request, signal, review) {
        analyze(review)
        const document = workspace.read(request.path)
        if (!document.ok) {
          throw new Error(document.error.code)
        }
        // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
        yield* streamNavigation({
          ...request,
          document: document.value,
          signal,
          workspace: {
            ...workspace,
            references: (path, offset, sources) =>
              workspace.references(path, offset, sources, review),
          },
        })
      },
    })
    const document = workspace.read('helper.ts')
    if (!document.ok) {
      throw new Error(document.error.code)
    }
    input = {
      navigation: 'definition',
      offset: 13,
      path: 'helper.ts',
      revision: document.value.revision,
    }
  })
  afterEach(() => {
    cache.dispose()
    workspace.dispose()
    rmSync(root, {force: true, recursive: true})
  })
  it('should reuse completed usages after a definition round trip and invalidate edited destinations', async () => {
    const caller = workspace.read('first.ts')
    if (!caller.ok) {
      throw new Error(caller.error.code)
    }
    const request = {
      ...input,
      offset: caller.value.source.lastIndexOf('greet'),
      path: 'first.ts',
      revision: caller.value.revision,
    }
    expect(await query(request)).toEqual([{column: 14, line: 1, path: 'helper.ts'}])
    const usages = await query()
    expect(usages).toHaveLength(4)
    expect(await query({...request, offset: request.offset + 1})).toEqual([
      {column: 14, line: 1, path: 'helper.ts'},
    ])
    expect(await query({...input, offset: input.offset + 2})).toEqual(usages)
    expect(analyze).toHaveBeenCalledTimes(2)
    await changed('second.ts', () =>
      writeFileSync(join(root, 'second.ts'), "\nimport {greet} from './helper'\ngreet()\n"),
    )
    expect(await query({...input, offset: input.offset + 1})).toEqual(sorted(await fresh()))
    expect(analyze).toHaveBeenCalledTimes(3)
    await changed('helper.ts', () =>
      writeFileSync(join(root, 'helper.ts'), 'export const greet = () => 2\n'),
    )
    await expect(query()).rejects.toThrow('stale-document')
    const updated = workspace.read('helper.ts')
    if (!updated.ok) {
      throw new Error(updated.error.code)
    }
    const current = {...input, revision: updated.value.revision}
    expect(await query(current)).toEqual(sorted(await fresh(current)))
    expect(analyze).toHaveBeenCalledTimes(4)
  })
  it('should retain verified groups and discover new aliased usages in closed files', async () => {
    expect(await query()).toEqual(await fresh())
    expect(await query()).toHaveLength(4)
    expect(analyze).toHaveBeenCalledOnce()
    notifyChange({event: 'rename', path: 'first.ts'})
    expect(await query()).toEqual(await fresh())
    expect(analyze).toHaveBeenCalledOnce()
    const reads = vi.mocked(readFile).mock.calls.length
    await changed('unrelated.ts', () =>
      writeFileSync(join(root, 'unrelated.ts'), 'export const other = 2\n'),
    )
    expect(await query()).toEqual(await fresh())
    expect(analyze).toHaveBeenCalledOnce()
    await changed('second.ts', () =>
      writeFileSync(
        join(root, 'second.ts'),
        "import {greet as hello} from './helper'\n\nhello()\nhello()\n",
      ),
    )
    expect(readFile).toHaveBeenCalledTimes(reads + 1)
    const stream = cache.scan(input, new AbortController().signal)
    const first = await stream.next()
    if (first.done) {
      throw new Error('Missing cached group')
    }
    expect(first.value.locations.map((location) => location.path)).toEqual(['first.ts', 'first.ts'])
    expect(analyze).toHaveBeenCalledOnce()
    const results = await Array.fromAsync(stream)
    expect(readFile).toHaveBeenCalledTimes(reads + 2)
    expect(analyze).toHaveBeenLastCalledWith({
      candidates: expect.arrayContaining(['helper.ts', 'first.ts', 'second.ts']),
      files: ['second.ts'],
      retained: ['first.ts'],
    })
    expect(
      results
        .flatMap((batch) => batch.locations)
        .every((location) => location.path === 'second.ts'),
    ).toBe(true)
    expect(
      results
        .flatMap((batch) => batch.locations)
        .some((location) => location.path === 'second.ts' && location.line === 4),
    ).toBe(true)
    expect(await query()).toEqual(await fresh())
    expect(analyze).toHaveBeenCalledTimes(2)
    await changed('later.ts', () =>
      writeFileSync(join(root, 'later.ts'), "import * as helper from './helper'\nhelper.greet()\n"),
    )
    expect(await query()).toEqual(await fresh())
    expect((await query()).some((location) => location.path === 'later.ts')).toBe(true)
    expect(analyze).toHaveBeenCalledTimes(3)
  })
  it('should update reexports, deletions and renames while matching a complete fresh search', async () => {
    await query()
    await changed('barrel.ts', () =>
      writeFileSync(join(root, 'barrel.ts'), "export {greet as hello} from './helper'\n"),
    )
    await changed('second.ts', () =>
      writeFileSync(join(root, 'second.ts'), "import {hello} from './barrel'\nhello()\n"),
    )
    expect(await query()).toEqual(await fresh())
    await changed('first.ts', () => rmSync(join(root, 'first.ts')))
    expect(await query()).toEqual(await fresh())
    await changed('second.ts', () => renameSync(join(root, 'second.ts'), join(root, 'renamed.ts')))
    const results = await query()
    expect(results).toEqual(await fresh())
    expect(results.some((location) => location.path === 'second.ts')).toBe(false)
    expect(results.some((location) => location.path === 'renamed.ts')).toBe(true)
    await changed('barrel.ts', () =>
      writeFileSync(join(root, 'barrel.ts'), 'export const hello = () => 2\n'),
    )
    expect(await query()).toEqual(await fresh())
  })
  it('should discover usages after a cached empty result and an unresolved import becomes resolvable', async () => {
    await changed('first.ts', () => rmSync(join(root, 'first.ts')))
    await changed('second.ts', () => rmSync(join(root, 'second.ts')))
    expect(await query()).toEqual([])
    expect(await query()).toEqual([])
    expect(analyze).toHaveBeenCalledOnce()
    await changed('pending.ts', () =>
      writeFileSync(join(root, 'pending.ts'), "import {hello} from './missing'\nhello()\n"),
    )
    expect(await query()).toEqual(await fresh())
    await changed('missing.ts', () =>
      writeFileSync(join(root, 'missing.ts'), "export {greet as hello} from './helper'\n"),
    )
    expect(await query()).toEqual(await fresh())
    expect((await query()).some((location) => location.path === 'pending.ts')).toBe(true)
  })
  it('should refresh path mappings and isolate unsaved source overlays', async () => {
    await query()
    mkdirSync(join(root, 'alternative'))
    await changed('alternative/helper.ts', () =>
      writeFileSync(join(root, 'alternative/helper.ts'), 'export const greet = () => 2\n'),
    )
    await changed('second.ts', () =>
      writeFileSync(join(root, 'second.ts'), "import {greet} from '@helper'\ngreet()\n"),
    )
    await changed('tsconfig.json', () =>
      writeFileSync(
        join(root, 'tsconfig.json'),
        '{"compilerOptions":{"noLib":true,"types":[],"paths":{"@helper":["./helper.ts"]}}}',
      ),
    )
    expect(await query()).toEqual(await fresh())
    const draft = {
      ...input,
      sources: [{path: 'first.ts', source: "import {greet} from './helper'\n\n\ngreet()\n"}],
    }
    expect(await query(draft)).toEqual(await fresh(draft))
    expect(await query()).toEqual(await fresh())
    await changed('tsconfig.json', () =>
      writeFileSync(
        join(root, 'tsconfig.json'),
        '{"compilerOptions":{"noLib":true,"types":[],"paths":{"@helper":["./alternative/helper.ts"]}}}',
      ),
    )
    expect(await query()).toEqual(await fresh())
    expect((await query()).some((location) => location.path === 'second.ts')).toBe(false)
  })
  it('should preserve inherited member references while reviewing one changed caller', async () => {
    const source = 'export class Base { run() { return 1 } }\n'
    await changed('helper.ts', () => writeFileSync(join(root, 'helper.ts'), source))
    await changed('first.ts', () =>
      writeFileSync(
        join(root, 'first.ts'),
        "import {Base} from './helper'\nconst instance = new Base()\ninstance.run()\n",
      ),
    )
    const derived =
      "import {Base} from './helper'\nclass Derived extends Base {}\nnew Derived().run()\n"
    await changed('second.ts', () => writeFileSync(join(root, 'second.ts'), derived))
    const document = workspace.read('helper.ts')
    if (!document.ok) {
      throw new Error(document.error.code)
    }
    const request = {...input, offset: source.indexOf('run'), revision: document.value.revision}
    expect(await query(request)).toEqual(await fresh(request))
    await changed('second.ts', () =>
      writeFileSync(join(root, 'second.ts'), `${derived}new Derived().run()\n`),
    )
    const locations = await query(request)
    expect(analyze).toHaveBeenLastCalledWith({
      candidates: expect.arrayContaining(['helper.ts', 'first.ts', 'second.ts']),
      files: ['second.ts'],
      retained: ['first.ts'],
    })
    expect(locations).toEqual(await fresh(request))
    expect(locations).toHaveLength(3)
  })
  it('should retain the complete context when ambient declarations prevent a local review', async () => {
    await changed('globals.d.ts', () =>
      writeFileSync(join(root, 'globals.d.ts'), 'declare const ambient: number\n'),
    )
    await query()
    await changed('second.ts', () =>
      writeFileSync(join(root, 'second.ts'), "import {greet} from './helper'\n\ngreet()\n"),
    )
    const locations = await query()
    expect(analyze).toHaveBeenLastCalledWith({
      candidates: expect.arrayContaining(['helper.ts', 'first.ts', 'second.ts']),
      files: undefined,
      retained: [],
    })
    expect(new Set(locations.map((location) => location.path))).toEqual(
      new Set(['first.ts', 'second.ts']),
    )
    expect(locations).toEqual(await fresh())
  })
})
