import {describe, expect, it, vi} from 'vitest'
import {createTimings} from '../create-timings'
import {scanLinkedReferences} from '../scan-linked-references'
import type {NativeLocation, NativePreparationOptions, NativeQuery, SourcePoint} from '../types'

const setup = () => {
  const events: string[] = []
  const origin = {file: '/workspace/entry.ts', offset: 0, source: 'export const value = 1'}
  const bindings: {local: SourcePoint; property: SourcePoint}[] = []
  const options = {
    client: {
      diagnostics: vi.fn(),
      dispose: vi.fn(),
      prepare: vi.fn(
        async (
          _paths: readonly string[],
          _sources?: ReadonlyMap<string, string>,
          preparation?: NativePreparationOptions,
        ) => {
          events.push('open')
          preparation?.dispatched?.()
        },
      ),
      query: vi.fn(async (query: NativeQuery): Promise<NativeLocation[]> => {
        events.push(query.kind)
        return []
      }),
    },
    definitions: [{column: 1, line: 1, path: 'entry.ts'}],
    locations: {exclude: vi.fn(), matches: vi.fn(() => false), publish: vi.fn(), read: vi.fn()},
    mark: vi.fn(),
    prepared: false,
    symbols: {canonicalize: vi.fn(), read: vi.fn()},
    timings: createTimings(),
    workspace: {
      bindings: vi.fn(() => bindings),
      checkpoint: vi.fn(),
      companions: vi.fn((): readonly SourcePoint[] => []),
      documents: vi.fn(() => {
        events.push('plan')
        return ['entry.ts']
      }),
      hasSources: vi.fn(() => true),
      location: vi.fn(),
      origins: vi.fn(),
      point: vi.fn(() => origin),
      prepare: vi.fn(() => {
        events.push('metadata')
        return ['entry.ts']
      }),
      statistics: vi.fn(),
    },
  }
  return {bindings, events, options, origin}
}

describe('scanLinkedReferences', () => {
  it('should deliver initial references and start project loading before metadata expansion', async () => {
    const {events, options} = setup()
    await scanLinkedReferences(options)
    expect(events).toEqual(['references', 'plan', 'open', 'metadata', 'references'])
    expect(options.client.prepare).toHaveBeenCalledWith(['entry.ts'], undefined, {
      dispatched: expect.any(Function),
    })
  })
  it('should expand metadata after dispatch while native preparation is still pending', async () => {
    const {events, options} = setup()
    const ready = Promise.withResolvers<void>()
    options.client.prepare.mockImplementation(async (_paths, _sources, preparation) => {
      events.push('open')
      preparation?.dispatched?.()
      await ready.promise
      events.push('ready')
    })
    const expanded = Promise.withResolvers<void>()
    options.workspace.prepare.mockImplementation(() => {
      events.push('metadata')
      expanded.resolve()
      return []
    })
    const complete = scanLinkedReferences(options)
    await expanded.promise
    expect(events).toEqual(['references', 'plan', 'open', 'metadata'])
    expect(options.workspace.companions).not.toHaveBeenCalled()
    ready.resolve()
    await complete
    expect(events).toEqual(['references', 'plan', 'open', 'metadata', 'ready', 'references'])
  })
  it('should drain preparation when metadata expansion fails', async () => {
    const {options} = setup()
    const ready = Promise.withResolvers<void>()
    const expanded = Promise.withResolvers<void>()
    options.client.prepare.mockImplementation(async (_paths, _sources, preparation) => {
      preparation?.dispatched?.()
      await ready.promise
    })
    options.workspace.prepare.mockImplementation(() => {
      expanded.resolve()
      throw new Error('metadata failed')
    })
    let settled = false
    const complete = scanLinkedReferences(options).finally(() => {
      settled = true
    })
    const failed = expect(complete).rejects.toThrow('metadata failed')
    await expanded.promise
    expect(settled).toBe(false)
    ready.resolve()
    await failed
    expect(options.workspace.companions).not.toHaveBeenCalled()
  })
  it('should reject preparation failure before metadata without waiting for dispatch', async () => {
    const {options} = setup()
    options.client.prepare.mockRejectedValue(new Error('preparation failed'))
    await expect(scanLinkedReferences(options)).rejects.toThrow('preparation failed')
    expect(options.workspace.prepare).not.toHaveBeenCalled()
  })
  it('should reuse prepared projects on repeat queries', async () => {
    const {events, options} = setup()
    await scanLinkedReferences({...options, prepared: true})
    expect(events).toEqual(['references', 'metadata'])
    expect(options.workspace.documents).not.toHaveBeenCalled()
    expect(options.client.prepare).not.toHaveBeenCalled()
  })
  it('should use expanded references as the readiness barrier before checking linking edges', async () => {
    const {events, options} = setup()
    const started = Promise.withResolvers<void>()
    const ready = Promise.withResolvers<NativeLocation[]>()
    options.client.query.mockImplementation(async (query) => {
      events.push(query.kind)
      if (events.filter((event) => event === 'references').length === 2) {
        started.resolve()
        return ready.promise
      }
      return []
    })
    const completed = scanLinkedReferences(options)
    await started.promise
    expect(events.filter((event) => event === 'references')).toHaveLength(2)
    expect(options.workspace.companions).not.toHaveBeenCalled()
    expect(options.mark).not.toHaveBeenCalledWith('projectsReady')
    ready.resolve([])
    await completed
    expect(events.filter((event) => event === 'references')).toHaveLength(2)
  })
  it('should bound binding checks while publishing a verified binding before the others finish', async () => {
    const {bindings, options, origin} = setup()
    bindings.push(
      ...[1, 2, 3].map((offset) => ({local: {...origin, offset}, property: {...origin, offset}})),
    )
    const waiting = Promise.withResolvers<NativeLocation[]>()
    const published = Promise.withResolvers<void>()
    options.symbols.read.mockImplementation(async (point: SourcePoint) => {
      if (point.offset === 2) {
        return waiting.promise
      }
      return options.definitions
    })
    options.locations.matches.mockReturnValue(true)
    options.locations.publish.mockImplementation(() => published.resolve())
    const complete = scanLinkedReferences({...options, concurrency: 2, prepared: true})
    await published.promise
    expect(options.symbols.read).toHaveBeenCalledTimes(2)
    expect(options.locations.publish).toHaveBeenCalledTimes(1)
    waiting.resolve([])
    await complete
    expect(options.symbols.read).toHaveBeenCalledTimes(3)
    expect(options.locations.publish).toHaveBeenCalledTimes(3)
  })
  it('should drain the active batch before rejecting without starting more checks', async () => {
    const {bindings, options, origin} = setup()
    bindings.push(
      ...[1, 2, 3].map((offset) => ({local: {...origin, offset}, property: {...origin, offset}})),
    )
    const started = Promise.withResolvers<void>()
    const waiting = Promise.withResolvers<NativeLocation[]>()
    options.symbols.read.mockImplementation(async (point: SourcePoint) => {
      if (point.offset === 1) {
        throw new Error('stale-source')
      }
      started.resolve()
      return waiting.promise
    })
    let settled = false
    const complete = scanLinkedReferences({...options, concurrency: 2, prepared: true})
    const failure = expect(
      complete.finally(() => {
        settled = true
      }),
    ).rejects.toThrow('stale-source')
    await started.promise
    expect(settled).toBe(false)
    waiting.resolve([])
    await failure
    expect(options.symbols.read).toHaveBeenCalledTimes(2)
  })
  it('should query expanded sources when preparation finished after initial references', async () => {
    const {events, options} = setup()
    await scanLinkedReferences({...options, preparation: async () => true})
    expect(events).toEqual(['references', 'metadata', 'references'])
    expect(options.client.prepare).not.toHaveBeenCalled()
  })
})
