import {afterEach, describe, expect, it, vi} from 'vitest'
import {readFileSync} from 'node:fs'
import {readDirectory} from '../../read-directory'
import {createNativeNavigation} from '../create-native-navigation'
import {createNativeClient} from '../create-native-client'
import {createWorkspaceLinks} from '../create-workspace-links'
import type {NativeQuery, SourcePoint} from '../types'

vi.mock('node:fs', () => {
  const module = {readFileSync: vi.fn()}
  return {...module, default: module}
})
vi.mock('../../read-directory', () => ({readDirectory: vi.fn()}))
vi.mock('../create-native-client', () => ({createNativeClient: vi.fn()}))
vi.mock('../create-workspace-links', () => ({createWorkspaceLinks: vi.fn()}))

const setup = (binary: string | (() => Promise<string>) = '/native/tsc') => {
  const point = {file: '/workspace/entry.ts', offset: 0, source: 'export const value = 1'}
  const location = {column: 14, line: 1, path: 'entry.ts'}
  const client = {
    diagnostics: vi.fn(),
    dispose: vi.fn(async () => undefined),
    prepare: vi.fn(async (_paths: readonly string[]) => undefined),
    query: vi.fn(async (_input: NativeQuery) => [location]),
  }
  const workspace = {
    bindings: vi.fn(() => []),
    checkpoint: vi.fn(async () => new Map()),
    companions: vi.fn(() => []),
    directReferences: vi.fn(
      (_input: SourcePoint, _includeUsages = false): (typeof location)[] => [],
    ),
    documents: vi.fn(() => ['entry.ts']),
    hasSources: vi.fn(() => true),
    location: vi.fn(() => location),
    origins: vi.fn(() => undefined),
    point: vi.fn(() => point),
    prepare: vi.fn(() => ['entry.ts']),
    statistics: vi.fn(),
  }
  vi.mocked(readFileSync).mockReturnValue(point.source)
  vi.mocked(readDirectory).mockResolvedValue({
    directories: [],
    excludedPaths: [],
    files: [{openable: true, path: 'entry.ts'}],
    truncated: false,
  })
  vi.mocked(createNativeClient).mockReturnValue(client)
  vi.mocked(createWorkspaceLinks).mockReturnValue(workspace)
  const linked = createNativeNavigation({
    binary,
    documents: [],
    receive: vi.fn(),
    root: '/workspace',
  })
  return {client, linked, point, workspace}
}

afterEach(() => vi.clearAllMocks())

describe('createNativeNavigation', () => {
  it('should skip executable preparation when discovery contains no native sources', async () => {
    const binary = vi.fn<() => Promise<string>>()
    const {linked, workspace} = setup(binary)
    workspace.hasSources.mockReturnValue(false)
    expect(await linked.warm()).toBe(false)
    expect(binary).not.toHaveBeenCalled()
    await linked.dispose()
  })
  it('should resolve the executable lazily and share concurrent initialization', async () => {
    const ready = Promise.withResolvers<string>()
    const binary = vi.fn(() => ready.promise)
    const {linked} = setup(binary)
    expect(binary).not.toHaveBeenCalled()
    const first = linked.initialize()
    const second = linked.initialize()
    ready.resolve('/downloaded/tsc')
    expect(await first).toBe(true)
    expect(await second).toBe(true)
    expect(binary).toHaveBeenCalledTimes(1)
    expect(createNativeClient).toHaveBeenCalledTimes(1)
    expect(createNativeClient).toHaveBeenCalledWith(
      expect.objectContaining({binary: '/downloaded/tsc'}),
    )
    await linked.dispose()
  })
  it('should retry executable preparation after a download failure', async () => {
    const binary = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue('/downloaded/tsc')
    const {linked} = setup(binary)
    expect(await linked.initialize()).toBe(false)
    expect(createNativeClient).not.toHaveBeenCalled()
    expect(await linked.initialize()).toBe(true)
    await linked.dispose()
  })
  it('should avoid starting a process after disposal during executable preparation', async () => {
    const ready = Promise.withResolvers<string>()
    const started = Promise.withResolvers<void>()
    const {linked} = setup(async () => {
      started.resolve()
      return ready.promise
    })
    const initialization = linked.initialize()
    await started.promise
    await linked.dispose()
    ready.resolve('/downloaded/tsc')
    expect(await initialization).toBe(false)
    expect(createNativeClient).not.toHaveBeenCalled()
  })
  it('should share workspace preparation and retain it for the first foreground search', async () => {
    const {client, linked, point, workspace} = setup()
    const ready = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    const references = Promise.withResolvers<void>()
    client.query.mockImplementation(async (input) => {
      if (input.kind === 'references') {
        references.resolve()
        return []
      }
      return [workspace.location()]
    })
    client.prepare.mockImplementation(async () => {
      started.resolve()
      await ready.promise
    })
    const first = linked.warm()
    const second = linked.warm()
    await started.promise
    const results = linked.query({...point, kind: 'references'})
    await references.promise
    ready.resolve()
    expect(await first).toBe(true)
    expect(await second).toBe(true)
    await results
    expect(createNativeClient).toHaveBeenCalledTimes(1)
    expect(client.prepare).toHaveBeenCalledTimes(1)
    expect(workspace.documents).toHaveBeenCalledTimes(1)
    await linked.dispose()
  })

  it('should discard failed preparation and let the foreground query retry', async () => {
    const {client, linked, point} = setup()
    client.prepare.mockRejectedValueOnce(new Error('unavailable'))
    expect(await linked.warm()).toBe(false)
    expect(await linked.query({...point, kind: 'definition'})).toHaveLength(1)
    expect(createNativeClient).toHaveBeenCalledTimes(2)
    expect(client.dispose).toHaveBeenCalledTimes(1)
    await linked.dispose()
  })

  it('should not begin new preparation after the workspace is disposed', async () => {
    const {linked} = setup()
    await linked.dispose()
    expect(await linked.warm()).toBe(false)
    expect(createNativeClient).not.toHaveBeenCalled()
  })
  it('should skip the native process when the workspace has no TypeScript or JavaScript files', async () => {
    const {linked, workspace} = setup()
    workspace.hasSources.mockReturnValue(false)
    expect(await linked.warm()).toBe(false)
    expect(createNativeClient).not.toHaveBeenCalled()
    await linked.dispose()
  })
  it('should discard metadata when a file changes during preparation', async () => {
    const {client, linked, point, workspace} = setup()
    workspace.checkpoint
      .mockResolvedValueOnce(new Map([['entry.ts', 'old']]))
      .mockResolvedValueOnce(new Map([['entry.ts', 'changed']]))
    expect(await linked.warm()).toBe(false)
    expect(client.dispose).toHaveBeenCalledTimes(1)
    expect(await linked.query({...point, kind: 'definition'})).toHaveLength(1)
    expect(createNativeClient).toHaveBeenCalledTimes(2)
    await linked.dispose()
  })
})

describe('early import delivery', () => {
  it('should consume imports before resolving local usages during native preparation', async () => {
    const {client, linked, point, workspace} = setup()
    const semantic = Promise.withResolvers<ReturnType<typeof workspace.location>[]>()
    const consumed = Promise.withResolvers<void>()
    const first = Promise.withResolvers<void>()
    const middle = Promise.withResolvers<void>()
    const imported = {...workspace.location(), column: 5, path: 'use.ts'}
    const usage = {...imported, line: 2}
    workspace.directReferences.mockImplementation((_input, includeUsages) =>
      includeUsages ? [imported, usage] : [imported],
    )
    client.query.mockImplementation(async (input) =>
      input.kind === 'definition' ? semantic.promise : [],
    )
    const batches: unknown[] = []
    const search = linked.query({
      ...point,
      kind: 'references',
      receive: async (locations) => {
        batches.push(locations)
        if (batches.length === 1) {
          first.resolve()
          await consumed.promise
        } else {
          middle.resolve()
        }
      },
    })
    await first.promise
    expect(workspace.directReferences).toHaveBeenCalledTimes(1)
    consumed.resolve()
    await middle.promise
    expect(batches).toEqual([[imported], [usage]])
    expect(workspace.prepare).not.toHaveBeenCalled()
    semantic.resolve([workspace.location()])
    await search
    await linked.dispose()
  })
  it('should stop local usage expansion when the first import delivery cancels the query', async () => {
    const {linked, point, workspace} = setup()
    const controller = new AbortController()
    workspace.directReferences.mockReturnValue([workspace.location()])
    await expect(
      linked.query({
        ...point,
        kind: 'references',
        receive: () => controller.abort(),
        signal: controller.signal,
      }),
    ).rejects.toThrow()
    expect(workspace.directReferences).toHaveBeenCalledTimes(1)
    expect(workspace.prepare).not.toHaveBeenCalled()
    await linked.dispose()
  })
})
