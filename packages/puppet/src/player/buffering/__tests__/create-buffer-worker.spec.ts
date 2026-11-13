import {createBufferEngine} from '../create-buffer-engine'
import {createEncoder} from '../render-frame/create-encoder'
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import type {PuppetSound} from '../../audio/decode-wav'
import {createBufferWorker} from '../create-buffer-worker'
import type {BufferRequest, PackedBufferResponse} from '../types'

afterEach(() => vi.unstubAllGlobals())

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
