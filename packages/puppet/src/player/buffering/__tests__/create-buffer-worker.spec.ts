import {createBufferEngine} from '../create-buffer-engine'
import {createEncoder} from '../render-frame/create-encoder'
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import type {PuppetSound} from '../../audio/decode-wav'
import {markPreparedPuppetDocument} from '../../internal/prepared-document'
import {createBufferWorker} from '../create-buffer-worker'
import type {BufferRequest, PackedBufferResponse, RustBufferRequest} from '../types'

afterEach(() => vi.unstubAllGlobals())

test('should send a validated model section and retry with the prepared document if Rust rejects it', async () => {
  const section = new Blob(['section'])
  const document = markPreparedPuppetDocument(createEmptyDocument(), section)
  const boundary = {
    onerror: null as Worker['onerror'],
    onmessage: null as ((event: MessageEvent<PackedBufferResponse>) => void) | null,
    onmessageerror: null as Worker['onmessageerror'],
    postMessage: vi.fn((request: RustBufferRequest) => {
      const data: PackedBufferResponse =
        request.kind === 'initialize-section'
          ? {id: request.id, kind: 'error', message: 'Invalid section'}
          : {bytes: 32, id: request.id, kind: 'initialized'}
      queueMicrotask(() => boundary.onmessage!(new MessageEvent('message', {data})))
    }),
    terminate: vi.fn(),
  }
  vi.stubGlobal(
    'Worker',
    vi.fn(function mockWorker() {
      return boundary
    }),
  )
  const onError = vi.fn()
  const worker = createBufferWorker(onError, 'rust')
  await expect(worker.initialize(document)).resolves.toBe(32)
  const [binary, fallback] = boundary.postMessage.mock.calls.map(([request]) => request)
  expect(binary).toEqual({
    id: 1,
    kind: 'initialize-section',
    partCount: document.parts.length,
    runtimeSection: section,
  })
  expect(fallback).toMatchObject({document, id: 2, kind: 'initialize'})
  expect(onError).not.toHaveBeenCalled()
  worker.destroy()
})

test.each([0, 999])(
  'should reject all pending requests when an uncorrelated error arrives with id %s',
  async (id) => {
    const boundary = {
      onerror: null as Worker['onerror'],
      onmessage: null as ((event: MessageEvent<PackedBufferResponse>) => void) | null,
      onmessageerror: null as Worker['onmessageerror'],
      postMessage: vi.fn(),
      terminate: vi.fn(),
    }
    vi.stubGlobal(
      'Worker',
      vi.fn(function mockWorker() {
        return boundary
      }),
    )
    const onError = vi.fn()
    const wire = createBufferWorker(onError, 'rust')
    const first = wire.initialize(createEmptyDocument())
    const second = wire.initialize(createEmptyDocument())
    const rejected = Promise.all([
      expect(first).rejects.toThrow('Invalid playback message'),
      expect(second).rejects.toThrow('Invalid playback message'),
    ])
    boundary.onmessage!(
      new MessageEvent('message', {data: {id, kind: 'error', message: 'Invalid playback message'}}),
    )
    await rejected
    expect(onError).toHaveBeenCalledOnce()
    const sent = boundary.postMessage.mock.calls.length
    await expect(wire.initialize(createEmptyDocument())).rejects.toThrow('Invalid playback message')
    expect(boundary.postMessage).toHaveBeenCalledTimes(sent)
    wire.destroy()
  },
)

test('should transfer only newly decoded sounds and remove dropped sounds without resending prior PCM', async () => {
  const boundary = {
    onerror: null as Worker['onerror'],
    onmessage: null as ((event: MessageEvent<PackedBufferResponse>) => void) | null,
    onmessageerror: null as Worker['onmessageerror'],
    postMessage: vi.fn(),
    terminate: vi.fn(),
  }
  vi.stubGlobal(
    'Worker',
    vi.fn(function mockWorker() {
      return boundary
    }),
  )
  const wire = createBufferWorker(vi.fn())
  const first: PuppetSound = {
    channels: [new Float32Array([0.25])],
    mono: new Float32Array([0.25]),
    sampleRate: 8000,
  }
  const second: PuppetSound = {
    channels: [new Float32Array([0.5])],
    mono: new Float32Array([0.5]),
    sampleRate: 8000,
  }
  const respond = (kind: 'initialized' | 'audio') => {
    const request = boundary.postMessage.mock.calls.at(-1)![0] as BufferRequest
    const response: PackedBufferResponse =
      kind === 'initialized' ? {bytes: 0, id: request.id, kind} : {id: request.id, kind}
    boundary.onmessage!(new MessageEvent('message', {data: response}))
    return request
  }
  const initialized = wire.initialize(createEmptyDocument(), new Map([['first', first]]))
  respond('initialized')
  await initialized
  const added = wire.updateAudio(
    new Map([
      ['first', first],
      ['second', second],
    ]),
  )
  const addition = respond('audio')
  await added
  expect(addition).toMatchObject({removed: [], sounds: new Map([['second', second]])})
  const removed = wire.updateAudio(new Map([['second', second]]))
  const removal = respond('audio')
  await removed
  expect(removal).toMatchObject({removed: ['first'], sounds: new Map()})
  const count = boundary.postMessage.mock.calls.length
  await wire.updateAudio(new Map([['second', second]]))
  expect(boundary.postMessage).toHaveBeenCalledTimes(count)
  wire.destroy()
})

test('should decode ordered transferred frames across stale responses and generation resets', async () => {
  const boundary = {
    onerror: null as Worker['onerror'],
    onmessage: null as ((event: MessageEvent<PackedBufferResponse>) => void) | null,
    onmessageerror: null as Worker['onmessageerror'],
    postMessage: vi.fn(),
    terminate: vi.fn(),
  }
  vi.stubGlobal(
    'Worker',
    vi.fn(function mockWorker() {
      return boundary
    }),
  )
  const document = {
    ...createEmptyDocument(),
    parts: [
      {
        id: 'part',
        mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
        texture: {height: 1, src: 'part.png', width: 1},
      },
    ],
    scene: undefined,
  }
  const engine = createBufferEngine(document)
  const encode = createEncoder()
  const wire = createBufferWorker(vi.fn())
  const send = (response: PackedBufferResponse) => {
    const request = boundary.postMessage.mock.calls.at(-1)![0] as BufferRequest
    boundary.onmessage!(new MessageEvent('message', {data: {...response, id: request.id}}))
  }
  const initialized = wire.initialize(document)
  send({bytes: engine.bytes, id: 0, kind: 'initialized'})
  await initialized
  const expected = engine.step(0, new ArrayBuffer(engine.bytes))
  const request = {buffer: new ArrayBuffer(engine.bytes), deltaTime: 0, generation: 1, time: 0}
  const produced = wire.produce(request)
  const packet = encode(expected.computed.frame)
  const transferred = structuredClone(packet, {
    transfer: [packet.parts.buffer, packet.layers.buffer],
  })
  const copyParts = vi.spyOn(transferred.parts, 'slice')
  const copyLayers = vi.spyOn(transferred.layers, 'slice')
  send({
    frame: {
      ...expected,
      computed: {...expected.computed, frame: transferred},
      deltaTime: 0,
      generation: 1,
      kind: 'frame',
      time: 0,
    },
    id: 0,
    kind: 'produced',
  })
  expect(await produced).toEqual({...expected, deltaTime: 0, generation: 1, kind: 'frame', time: 0})
  expect(copyParts).not.toHaveBeenCalled()
  expect(copyLayers).not.toHaveBeenCalled()
  const reset = wire.reset(expected.state, 2)
  send({id: 0, kind: 'reset'})
  await reset
  const stale = wire.produce(request)
  send({frame: {buffer: request.buffer, generation: 1, kind: 'stale'}, id: 0, kind: 'produced'})
  expect(await stale).toMatchObject({generation: 1, kind: 'stale'})
  const current = wire.produce({...request, generation: 2})
  send({
    frame: {
      ...expected,
      computed: {...expected.computed, frame: encode(expected.computed.frame)},
      deltaTime: 0,
      generation: 2,
      kind: 'frame',
      time: 0,
    },
    id: 0,
    kind: 'produced',
  })
  expect(await current).toEqual({...expected, deltaTime: 0, generation: 2, kind: 'frame', time: 0})
  wire.destroy()
  expect(boundary.terminate).toHaveBeenCalledOnce()
})

test('should select the Rust Worker only when explicitly requested', () => {
  const boundary = {
    onerror: null,
    onmessage: null,
    onmessageerror: null,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  }
  const construct = vi.fn(function mockWorker(_url: string | URL, _options?: WorkerOptions) {
    return boundary
  })
  vi.stubGlobal('Worker', construct)
  const rust = createBufferWorker(vi.fn(), 'rust')
  const javascript = createBufferWorker(vi.fn())
  expect(String(construct.mock.calls[0]?.[0])).toContain('/rust-worker.ts')
  expect(String(construct.mock.calls[1]?.[0])).toContain('/worker.ts')
  rust.destroy()
  javascript.destroy()
})

test('should send adjustments against the latest Rust checkpoint and use a full state after reset', async () => {
  const boundary = {
    onmessage: null as ((event: MessageEvent<PackedBufferResponse>) => void) | null,
    postMessage: vi.fn<(request: RustBufferRequest) => void>(),
    terminate: vi.fn(),
  }
  vi.stubGlobal('Worker', function mockWorker() {
    return boundary
  })
  const worker = createBufferWorker(vi.fn(), 'rust')
  const engine = createBufferEngine(createEmptyDocument())
  const encode = createEncoder()
  const frame = engine.step(0, new ArrayBuffer(engine.bytes))
  const request = {buffer: new ArrayBuffer(engine.bytes), deltaTime: 0, generation: 1, time: 0}
  const respond = (response: PackedBufferResponse) => {
    boundary.onmessage!(new MessageEvent('message', {data: response}))
  }
  const sendFrame = (id: number) => {
    respond({
      frame: {
        ...frame,
        computed: {...frame.computed, frame: encode(frame.computed.frame)},
        ...request,
        kind: 'frame',
      },
      id,
      kind: 'produced',
    })
  }
  const first = worker.produce(request)
  sendFrame(1)
  const checkpoint = await first
  if (checkpoint.kind !== 'frame') {
    throw new Error('Expected a computed checkpoint')
  }
  const state = {...checkpoint.state, adjustments: {...checkpoint.state.adjustments}}
  const input = {adjustmentBase: checkpoint.state, revision: 1, settle: false, state}
  const next = worker.produce({...request, input})
  const expected = {adjustments: state.adjustments, checkpointId: 1, revision: 1, settle: false}
  expect(boundary.postMessage.mock.lastCall?.[0]).toMatchObject({request: {input: expected}})
  expect(boundary.postMessage.mock.lastCall?.[0]).not.toHaveProperty('request.input.state')
  sendFrame(2)
  await next

  const reset = worker.reset(state, 2)
  respond({id: 3, kind: 'reset'})
  await reset
  const afterReset = worker.produce({...request, generation: 2, input})
  expect(boundary.postMessage.mock.lastCall?.[0]).toMatchObject({request: {input: {state}}})
  expect(boundary.postMessage.mock.lastCall?.[0]).not.toHaveProperty('request.input.adjustmentBase')
  respond({frame: {buffer: request.buffer, generation: 2, kind: 'stale'}, id: 4, kind: 'produced'})
  await afterReset
  worker.destroy()
})
