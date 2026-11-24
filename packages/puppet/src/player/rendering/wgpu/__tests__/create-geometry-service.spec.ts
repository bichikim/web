import {MessageChannel} from 'node:worker_threads'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {GeometryFinisher} from '../wasm/runtime'
import {createGeometryService} from '../create-geometry-service'
import {createGpuQueue} from '../create-queue'
import type {GeometryRequest, GeometryResponse} from '../../../geometry/types'
vi.mock('../wasm/runtime', () => ({GeometryFinisher: vi.fn()}))
beforeEach(() =>
  vi.mocked(GeometryFinisher).mockImplementation(function construct() {
    return {free: vi.fn(), [Symbol.dispose]: vi.fn()}
  }),
)
afterEach(() => vi.clearAllMocks())
const setup = async () => {
  const channel = new MessageChannel()
  const run = createGpuQueue()
  const renderer = {
    draw_geometry: vi.fn().mockReturnValue(new Float32Array([5, 6])),
    enable_geometry: vi.fn().mockResolvedValue(undefined),
    prepare_geometry: vi.fn().mockResolvedValue(new Float32Array([3, 4])),
    release_geometry: vi.fn(),
    request_alpha: vi.fn(),
  }
  const service = createGeometryService({onError: vi.fn(), renderer: () => renderer, run})
  service.connect('device', 1, channel.port1 as unknown as MessagePort)
  const send = (data: GeometryRequest) =>
    new Promise<GeometryResponse>((resolve) => {
      channel.port2.once('message', resolve)
      channel.port2.postMessage(data)
    })
  expect(await send({id: 1, kind: 'initialize', layout: new Float64Array()})).toEqual({
    id: 1,
    kind: 'initialized',
  })
  return {
    async close() {
      service.destroy()
      await run(() => undefined)
      channel.port1.close()
      channel.port2.close()
    },
    renderer,
    run,
    send,
    service,
  }
}
const prepare = {
  commands: new Uint32Array(),
  frame: 1,
  id: 2,
  kind: 'prepare' as const,
  plan: new Float64Array(),
  values: new Float32Array(),
  vertices: new Float32Array([1, 2]),
}
const token = {connection: 1, frame: 1, owner: 'device'}
test('should allow a draw to arrive before preparation and return that owned frame', async () => {
  const s = await setup()
  try {
    const drawing = s.service.draw(token, new Float32Array())
    const response = await s.send(prepare)
    expect(response.kind).toBe('prepared')
    expect(Array.from(await drawing)).toEqual([5, 6])
    const id = s.renderer.prepare_geometry.mock.calls[0]![0]
    expect(s.renderer.draw_geometry).toHaveBeenCalledWith(id, expect.any(Float32Array))
    s.service.release(token)
    await s.run(() => undefined)
    expect(s.renderer.release_geometry).toHaveBeenCalledWith(id)
  } finally {
    await s.close()
  }
})

test('should send packed coordinates with the ranges from the geometry jobs', async () => {
  const s = await setup()
  try {
    const vertices = new Float32Array([3, 4, 5, 6])
    s.renderer.prepare_geometry.mockResolvedValueOnce(vertices)
    const response = await s.send({
      ...prepare,
      commands: new Uint32Array([2, 1, 0, 5, 0, 1, 0, 5]),
      vertices: new Float32Array(8),
    })
    expect(response).toMatchObject({id: 2, kind: 'prepared'})
    if (response.kind !== 'prepared' || response.ranges === undefined) {
      throw new Error('Expected packed geometry')
    }
    expect(Array.from(response.ranges)).toEqual([4, 2, 0, 2])
    expect(Array.from(response.vertices)).toEqual([3, 4, 5, 6])
  } finally {
    await s.close()
  }
})
test('should discard a cancelled prediction before spending GPU work on it', async () => {
  const s = await setup()
  try {
    s.service.release(token)
    expect(await s.send(prepare)).toEqual({id: 2, kind: 'cancelled'})
    expect(s.renderer.prepare_geometry).not.toHaveBeenCalled()
  } finally {
    await s.close()
  }
})
test('should let native preparation observe a release while awaiting GPU geometry', async () => {
  const s = await setup()
  try {
    s.renderer.prepare_geometry.mockImplementationOnce(async (...args) => {
      const isCancelled = args[6]
      expect(isCancelled()).toBe(false)
      s.service.release(token)
      expect(isCancelled()).toBe(true)
      return undefined
    })
    expect(await s.send(prepare)).toEqual({id: 2, kind: 'cancelled'})
    expect(await s.send({...prepare, frame: 2, id: 3})).toMatchObject({
      id: 3,
      kind: 'prepared',
    })
  } finally {
    await s.close()
  }
})
test('should reject a waiting draw when its rendering connection closes', async () => {
  const s = await setup()
  try {
    const rejected = expect(s.service.draw(token, new Float32Array())).rejects.toThrow('closed')
    s.service.disconnect(1)
    await rejected
    await expect(s.service.draw(token, new Float32Array())).rejects.toThrow(
      'another rendering device',
    )
  } finally {
    await s.close()
  }
})

test('should cancel a waiting draw before its preparation arrives', async () => {
  const s = await setup()
  try {
    const rejected = expect(s.service.draw(token, new Float32Array())).rejects.toThrow('released')
    s.service.release(token)
    await rejected
    expect(await s.send(prepare)).toEqual({id: 2, kind: 'cancelled'})
    expect(s.renderer.prepare_geometry).not.toHaveBeenCalled()
    await expect(s.service.draw(token, new Float32Array())).rejects.toThrow('released')
  } finally {
    await s.close()
  }
})
