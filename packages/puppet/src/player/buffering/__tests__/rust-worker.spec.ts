import {afterEach, expect, test, vi} from 'vitest'
import {loadWasmWorker} from '../../internal/wasm/load-worker'
import {createEmptyDocument} from '../../create-empty-document'
import {createBufferEngine} from '../create-buffer-engine'
import {createDecoder} from '../render-frame/create-decoder'
import {createEncoder} from '../render-frame/create-encoder'
import type {BufferRequest, PackedBufferResponse, WasmBufferRequest} from '../types'
import {createGeometryClient} from '../../geometry/create-client'

vi.mock('../../internal/wasm/load-worker', () => ({loadWasmWorker: vi.fn()}))
vi.mock('../../geometry/create-client', () => ({createGeometryClient: vi.fn()}))

afterEach(() => {
  vi.resetAllMocks()
  vi.resetModules()
  vi.unstubAllGlobals()
})
const boundary = async () => {
  let receive: (event: MessageEvent<BufferRequest>) => void = () => {}
  const replies: Array<{response: PackedBufferResponse; transfer: Transferable[]}> = []
  let waiting: Array<{count: number; resolve: () => void}> = []
  let completed = () => {}
  const done = new Promise<void>((resolve) => {
    completed = resolve
  })
  vi.stubGlobal('self', {
    addEventListener: (_name: string, listener: typeof receive) => {
      receive = listener
    },
    postMessage: (response: PackedBufferResponse, options: StructuredSerializeOptions) => {
      replies.push({response, transfer: options.transfer ?? []})
      completed()
      const ready = waiting.filter((waiter) => replies.length >= waiter.count)
      waiting = waiting.filter((waiter) => replies.length < waiter.count)
      ready.forEach((waiter) => waiter.resolve())
    },
  })
  await import('../rust-worker')
  return {
    done,
    replies,
    reply: (count: number) =>
      replies.length >= count
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            waiting.push({count, resolve})
          }),
    send: (data: BufferRequest) => receive(new MessageEvent('message', {data})),
  }
}

test('should deliver a resident render ticket before GPU completion and cache its later result', async () => {
  const engine = createBufferEngine(createEmptyDocument())
  const base = engine.step(0, new ArrayBuffer(engine.bytes))
  const vertices = new Float32Array([1, 2])
  let complete: (value: import('../../geometry/types').GeometryCompletion) => void = () => {}
  const evaluated = new Promise<import('../../geometry/types').GeometryCompletion>((resolve) => {
    complete = resolve
  })
  let cached = () => {}
  const committed = new Promise<void>((resolve) => {
    cached = resolve
  })
  const cache = vi.fn(() => cached())
  const finish = vi.fn()
  vi.mocked(createGeometryClient).mockReturnValue({
    free: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    prepare: vi.fn().mockReturnValue(evaluated),
  })
  vi.mocked(loadWasmWorker).mockResolvedValue({
    destroy: vi.fn(),
    geometry: {
      cache,
      finish,
      layout: () => new Float64Array(),
      take: () => ({
        commands: new Uint32Array([0, 1, 0, 1]),
        id: 1,
        plan: new Float64Array(),
        values: new Float32Array(),
      }),
    },
    process: vi.fn(),
    processPacked: vi.fn(
      (request: WasmBufferRequest): PackedBufferResponse =>
        request.kind === 'initialize'
          ? {bytes: 8, id: request.id, kind: 'initialized'}
          : {
              frame: {
                ...base,
                computed: {...base.computed, frame: createEncoder()(base.computed.frame), vertices},
                deltaTime: 0,
                generation: 1,
                kind: 'frame',
                time: 0,
              },
              id: request.id,
              kind: 'produced',
            },
    ),
  })
  const wire = await boundary()
  wire.send({
    audio: new Map(),
    document: createEmptyDocument(),
    geometry: {connection: 4, owner: 'device', port: {} as MessagePort},
    id: 1,
    kind: 'initialize',
  })
  await wire.reply(1)
  wire.send({
    id: 2,
    kind: 'produce',
    request: {buffer: vertices.buffer, deltaTime: 0, generation: 1, time: 0},
  })
  await wire.reply(2)
  expect(cache).not.toHaveBeenCalled()
  expect(finish).not.toHaveBeenCalled()
  expect(wire.replies[1]!.response).toMatchObject({
    frame: {computed: {geometry: {connection: 4, frame: 1, owner: 'device'}}},
  })
  complete({id: 2, kind: 'prepared', vertices: new Float32Array([3, 4])})
  await committed
  expect(cache).toHaveBeenCalledWith(1, new Float32Array([3, 4]), undefined)
  expect(finish).not.toHaveBeenCalled()
})

test('should keep initialization and audio messages ordered while Rust loads', async () => {
  let complete: (runtime: Awaited<ReturnType<typeof loadWasmWorker>>) => void = () => {}
  const loaded = new Promise<Awaited<ReturnType<typeof loadWasmWorker>>>((resolve) => {
    complete = resolve
  })
  vi.mocked(loadWasmWorker).mockReturnValue(loaded)
  const processed: string[] = []
  const runtime = {
    destroy: vi.fn(),
    process: vi.fn(),
    processPacked: vi.fn((request: WasmBufferRequest): PackedBufferResponse => {
      processed.push(request.kind)
      return request.kind === 'initialize'
        ? {bytes: 0, id: request.id, kind: 'initialized'}
        : {id: request.id, kind: 'audio'}
    }),
  }
  const wire = await boundary()
  wire.send({audio: new Map(), document: createEmptyDocument(), id: 1, kind: 'initialize'})
  wire.send({id: 2, kind: 'audio', removed: [], sounds: new Map()})
  expect(processed).toEqual([])
  complete(runtime)
  await vi.waitFor(() => expect(wire.replies).toHaveLength(2))
  expect(processed).toEqual(['initialize', 'audio'])
  expect(wire.replies.map(({response}) => response.kind)).toEqual(['initialized', 'audio'])
  expect(loadWasmWorker).toHaveBeenCalledOnce()
})

test('should pack a Rust frame and transfer the supplied vertex storage', async () => {
  const engine = createBufferEngine(createEmptyDocument())
  const vertices = new ArrayBuffer(engine.bytes)
  const expected = engine.step(0, vertices)
  const runtime = {
    destroy: vi.fn(),
    process: vi.fn(),
    processPacked: vi.fn(
      (request: WasmBufferRequest): PackedBufferResponse =>
        request.kind === 'initialize'
          ? {bytes: engine.bytes, id: request.id, kind: 'initialized'}
          : {
              frame: {
                ...expected,
                computed: {...expected.computed, frame: createEncoder()(expected.computed.frame)},
                deltaTime: 0,
                generation: 1,
                kind: 'frame',
                time: 0,
              },
              id: request.id,
              kind: 'produced',
            },
    ),
  }
  vi.mocked(loadWasmWorker).mockResolvedValue(runtime)
  const wire = await boundary()
  wire.send({audio: new Map(), document: createEmptyDocument(), id: 1, kind: 'initialize'})
  wire.send({
    id: 2,
    kind: 'produce',
    request: {buffer: vertices, deltaTime: 0, generation: 1, time: 0},
  })
  await vi.waitFor(() => expect(wire.replies).toHaveLength(2))
  const last = wire.replies[1]!
  if (last.response.kind !== 'produced' || last.response.frame.kind !== 'frame') {
    throw new Error('Expected frame')
  }
  const frame = last.response.frame
  expect(createDecoder()(frame.computed.frame)).toEqual(expected.computed.frame)
  expect(last.transfer).toEqual([
    vertices,
    frame.computed.frame.parts.buffer,
    frame.computed.frame.layers.buffer,
  ])
  expect(loadWasmWorker).toHaveBeenCalledOnce()
})

test('should return stale frame storage without encoding it', async () => {
  const buffer = new ArrayBuffer(8)
  const runtime = {
    destroy: vi.fn(),
    process: vi.fn(),
    processPacked: vi.fn(
      (request: WasmBufferRequest): PackedBufferResponse =>
        request.kind === 'initialize'
          ? {bytes: 8, id: request.id, kind: 'initialized'}
          : {frame: {buffer, generation: 1, kind: 'stale'}, id: request.id, kind: 'produced'},
    ),
  }
  vi.mocked(loadWasmWorker).mockResolvedValue(runtime)
  const wire = await boundary()
  wire.send({audio: new Map(), document: createEmptyDocument(), id: 1, kind: 'initialize'})
  wire.send({id: 2, kind: 'produce', request: {buffer, deltaTime: 0, generation: 1, time: 0}})
  await vi.waitFor(() => expect(wire.replies).toHaveLength(2))
  expect(wire.replies[1]?.transfer).toEqual([buffer])
  expect(wire.replies[1]?.response).toMatchObject({frame: {buffer, kind: 'stale'}})
})

test('should report a failed Rust initialization without acknowledging it as initialized', async () => {
  vi.mocked(loadWasmWorker).mockRejectedValue(new Error('Wasm unavailable'))
  const wire = await boundary()
  wire.send({audio: new Map(), document: createEmptyDocument(), id: 1, kind: 'initialize'})
  await wire.done
  expect(wire.replies[0]?.response).toEqual({id: 1, kind: 'error', message: 'Wasm unavailable'})
})

test('should dispose the prior Rust runtime when a new document initializes', async () => {
  const make = () => ({
    destroy: vi.fn(),
    process: vi.fn(),
    processPacked: vi.fn(
      (request: WasmBufferRequest): PackedBufferResponse => ({
        bytes: 0,
        id: request.id,
        kind: 'initialized',
      }),
    ),
  })
  const first = make()
  const second = make()
  vi.mocked(loadWasmWorker).mockResolvedValueOnce(first).mockResolvedValueOnce(second)
  const wire = await boundary()
  wire.send({audio: new Map(), document: createEmptyDocument(), id: 1, kind: 'initialize'})
  wire.send({audio: new Map(), document: createEmptyDocument(), id: 2, kind: 'initialize'})
  await vi.waitFor(() => expect(wire.replies).toHaveLength(2))
  expect(first.destroy).toHaveBeenCalledOnce()
  expect(first.processPacked).toHaveBeenCalledOnce()
  expect(second.processPacked).toHaveBeenCalledOnce()
})
