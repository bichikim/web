import {afterEach, describe, expect, it, vi} from 'vitest'
import {createSymbolIdentities} from '../create-symbol-identities'
import type {NativeLocation, NativeQuery, SourcePoint} from '../types'

const setup = () => {
  const point = {file: '/workspace/entry.ts', offset: 0, source: 'export const value = 1'}
  const location = {column: 14, line: 1, path: 'entry.ts'}
  const workspace = {
    location: vi.fn((_point: SourcePoint) => location),
    origins: vi.fn((_point: SourcePoint): readonly SourcePoint[] | undefined => undefined),
    point: vi.fn((_location: NativeLocation) => point),
  }
  const client = {
    query: vi.fn(async (_input: NativeQuery): Promise<NativeLocation[]> => [location]),
  }
  return {client, location, point, workspace}
}

afterEach(() => vi.clearAllMocks())

describe('createSymbolIdentities', () => {
  it('should share concurrent identity work and retain the completed identity', async () => {
    const {client, location, point, workspace} = setup()
    const pending = Promise.withResolvers<NativeLocation[]>()
    client.query.mockReturnValue(pending.promise)
    const symbols = createSymbolIdentities(workspace, client, new Map())
    const first = symbols.read(point)
    const second = symbols.read({...point})
    pending.resolve([location])
    expect(await first).toEqual([location])
    expect(await second).toEqual([location])
    expect(await symbols.read(point)).toEqual([location])
    expect(client.query).toHaveBeenCalledTimes(1)
  })

  it('should retry a failed shared request without retaining its rejection', async () => {
    const {client, location, point, workspace} = setup()
    client.query.mockRejectedValueOnce(new Error('unavailable'))
    const symbols = createSymbolIdentities(workspace, client, new Map())
    const failures = await Promise.allSettled([symbols.read(point), symbols.read(point)])
    expect(failures.map((failure) => failure.status)).toEqual(['rejected', 'rejected'])
    expect(client.query).toHaveBeenCalledTimes(1)
    expect(await symbols.read(point)).toEqual([location])
    expect(client.query).toHaveBeenCalledTimes(2)
  })

  it('should preserve different source snapshots as separate requests', async () => {
    const {client, point, workspace} = setup()
    const symbols = createSymbolIdentities(workspace, client, new Map())
    await Promise.all([symbols.read(point), symbols.read({...point, source: 'changed'})])
    expect(client.query).toHaveBeenCalledTimes(2)
  })
  it('should retain a definition whose value cannot resolve beyond itself', async () => {
    const {client, location, point, workspace} = setup()
    workspace.origins.mockReturnValue([point])
    const symbols = createSymbolIdentities(workspace, client, new Map())
    expect(await symbols.canonicalize([location])).toEqual([location])
    expect(client.query).toHaveBeenCalledTimes(1)
  })
  it('should reuse prepared origin requests but query initial project origins again', async () => {
    const {client, location, point, workspace} = setup()
    const exported = {column: 19, line: 2, path: 'exported.cjs'}
    const origin = {...point, file: '/workspace/exported.cjs', offset: 20}
    workspace.point.mockImplementation((target) => (target.path === exported.path ? origin : point))
    workspace.location.mockImplementation((target) =>
      target.file === origin.file ? exported : location,
    )
    workspace.origins.mockImplementation((target) =>
      target.file === origin.file ? [origin] : undefined,
    )
    client.query.mockImplementation(async (input) =>
      input.file === origin.file ? [location] : [exported],
    )
    const symbols = createSymbolIdentities(workspace, client, new Map())
    expect(await symbols.read({...point, file: '/workspace/one.cjs'})).toEqual([location])
    expect(await symbols.read({...point, file: '/workspace/two.cjs'})).toEqual([location])
    expect(client.query.mock.calls.filter(([input]) => input.file === origin.file)).toHaveLength(1)
    expect(symbols.statistics().rawRetained).toBe(1)
    await symbols.canonicalize([exported])
    expect(client.query.mock.calls.filter(([input]) => input.file === origin.file)).toHaveLength(2)
  })
})
